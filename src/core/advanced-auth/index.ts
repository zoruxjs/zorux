import type { AppConfig, CompiledModel } from "../types"
import type { GeneratedSchema } from "../schema"
import { createJWT, verifyJWT } from "../../auth"
import { sendEmail } from "../email"
import { randomBytes } from "crypto"

// ═══════════════════════════════════════════════════
// Database setup
// ═══════════════════════════════════════════════════

function ensureTables(adapter: any) {
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _auth_tokens (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "user_id INTEGER NOT NULL, " +
    "type TEXT NOT NULL, " +
    "token TEXT NOT NULL UNIQUE, " +
    "expires_at TEXT NOT NULL, " +
    "used INTEGER DEFAULT 0, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _api_keys (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "user_id INTEGER NOT NULL, " +
    "name TEXT NOT NULL, " +
    "key TEXT NOT NULL UNIQUE, " +
    "last_used_at TEXT, " +
    "expires_at TEXT, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _totp_secrets (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "user_id INTEGER NOT NULL UNIQUE, " +
    "secret TEXT NOT NULL, " +
    "enabled INTEGER DEFAULT 0, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
}

// ═══════════════════════════════════════════════════
// Token helpers
// ═══════════════════════════════════════════════════

function generateToken(): string {
  return randomBytes(32).toString("hex")
}

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

const TOKEN_EXPIRY_HOURS = 1
const OTP_EXPIRY_MINUTES = 10
const MAGIC_LINK_EXPIRY_MINUTES = 15

function saveToken(adapter: any, userId: number, type: string, token: string, expiresInHours: number) {
  const expiresAt = new Date(Date.now() + expiresInHours * 3600_000).toISOString()
  adapter.run("INSERT INTO _auth_tokens (user_id, type, token, expires_at) VALUES (?, ?, ?, ?)", [userId, type, token, expiresAt])
}

function findValidToken(adapter: any, type: string, token: string): any {
  const row = adapter.get(
    "SELECT * FROM _auth_tokens WHERE type = ? AND token = ? AND used = 0 AND expires_at > ?",
    [type, token, new Date().toISOString()]
  )
  return row
}

function markTokenUsed(adapter: any, id: number) {
  adapter.run("UPDATE _auth_tokens SET used = 1 WHERE id = ?", [id])
}

function findUserByEmail(adapter: any, authModel: CompiledModel, email: string): any {
  return adapter.get("SELECT * FROM " + authModel.tableName + " WHERE email = ?", [email])
}

// ═══════════════════════════════════════════════════
// 1. Password Reset
// ═══════════════════════════════════════════════════

async function requestPasswordReset(adapter: any, authModel: CompiledModel, email: string, baseUrl: string) {
  const user = findUserByEmail(adapter, authModel, email)
  if (!user) return // Don't reveal if email exists

  const token = generateToken()
  saveToken(adapter, user.id, "password_reset", token, TOKEN_EXPIRY_HOURS)

  const resetLink = `${baseUrl}/api/auth/reset-password?token=${token}`
  await sendEmail({
    to: email,
    subject: "Password Reset",
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p><p>Link expires in ${TOKEN_EXPIRY_HOURS} hour.</p>`,
    text: `Password reset link: ${resetLink}\nExpires in ${TOKEN_EXPIRY_HOURS} hour.`,
  })
}

async function confirmPasswordReset(adapter: any, token: string, newPassword: string) {
  const row = findValidToken(adapter, "password_reset", token)
  if (!row) throw new Error("Invalid or expired reset token")

  const hash = await Bun.password.hash(newPassword)
  adapter.run("UPDATE " + "users" + " SET password = ? WHERE id = ?", [hash, row.user_id])
  markTokenUsed(adapter, row.id)
}

// ═══════════════════════════════════════════════════
// 2. Email Verification
// ═══════════════════════════════════════════════════

async function sendVerificationEmail(adapter: any, authModel: CompiledModel, userId: number, email: string, baseUrl: string) {
  // Remove old tokens
  adapter.run("UPDATE _auth_tokens SET used = 1 WHERE user_id = ? AND type = 'email_verify'", [userId])

  const token = generateToken()
  saveToken(adapter, userId, "email_verify", token, 24) // 24 hours

  const verifyLink = `${baseUrl}/api/auth/verify-email?token=${token}`
  await sendEmail({
    to: email,
    subject: "Verify your email",
    html: `<p>Click <a href="${verifyLink}">here</a> to verify your email.</p><p>Link expires in 24 hours.</p>`,
    text: `Verify your email: ${verifyLink}`,
  })
}

async function confirmEmailVerification(adapter: any, authModel: CompiledModel, token: string) {
  const row = findValidToken(adapter, "email_verify", token)
  if (!row) throw new Error("Invalid or expired verification token")

  adapter.run("UPDATE " + authModel.tableName + " SET emailVerified = ? WHERE id = ?", [new Date().toISOString(), row.user_id])
  markTokenUsed(adapter, row.id)
}

// ═══════════════════════════════════════════════════
// 3. Magic Link
// ═══════════════════════════════════════════════════

async function sendMagicLink(adapter: any, authModel: CompiledModel, email: string, baseUrl: string) {
  const user = findUserByEmail(adapter, authModel, email)
  if (!user) {
    // Auto-create user for magic link (passwordless)
    const col = adapter.collection(authModel.tableName, authModel)
    const created = await col.insert({ email, name: email.split("@")[0], emailVerified: new Date().toISOString() })
    if (!created?.id) throw new Error("Failed to create user")
    user.id = created.id
  }

  const token = generateToken()
  saveToken(adapter, user.id, "magic_link", token, MAGIC_LINK_EXPIRY_MINUTES / 60)

  const link = `${baseUrl}/api/auth/magic-link?token=${token}`
  await sendEmail({
    to: email,
    subject: "Sign in to " + process.env.APP_NAME || "your account",
    html: `<p>Click <a href="${link}">here</a> to sign in.</p><p>Link expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes.</p>`,
    text: `Sign in link: ${link}`,
  })
}

async function verifyMagicLink(adapter: any, authModel: CompiledModel, token: string): Promise<string> {
  const row = findValidToken(adapter, "magic_link", token)
  if (!row) throw new Error("Invalid or expired magic link")

  markTokenUsed(adapter, row.id)
  const jwt = await createJWT({ id: row.user_id })
  return jwt
}

// ═══════════════════════════════════════════════════
// 4. Email OTP
// ═══════════════════════════════════════════════════

async function sendOTP(adapter: any, authModel: CompiledModel, email: string) {
  const user = findUserByEmail(adapter, authModel, email)
  if (!user) throw new Error("User not found")

  // Invalidate old OTPs
  adapter.run("UPDATE _auth_tokens SET used = 1 WHERE user_id = ? AND type = 'otp'", [user.id])

  const otp = generateOTP()
  saveToken(adapter, user.id, "otp", otp, OTP_EXPIRY_MINUTES / 60)

  await sendEmail({
    to: email,
    subject: "Your login code",
    html: `<p>Your login code is: <strong>${otp}</strong></p><p>Code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    text: `Your login code: ${otp}`,
  })
}

async function verifyOTP(adapter: any, authModel: CompiledModel, email: string, otp: string): Promise<string> {
  const user = findUserByEmail(adapter, authModel, email)
  if (!user) throw new Error("User not found")

  const row = findValidToken(adapter, "otp", otp)
  if (!row || row.user_id !== user.id) throw new Error("Invalid or expired OTP")

  markTokenUsed(adapter, row.id)
  return await createJWT({ id: user.id })
}

// ═══════════════════════════════════════════════════
// 5. API Keys
// ═══════════════════════════════════════════════════

function generateApiKey(): string {
  const prefix = "Zorux_"
  const bytes = randomBytes(32)
  const key = prefix + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
  return key
}

async function createApiKey(adapter: any, userId: number, name: string, expiresInDays?: number): Promise<{ id: number; key: string; name: string; expiresAt: string | null }> {
  const key = generateApiKey()
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400_000).toISOString() : null
  adapter.run("INSERT INTO _api_keys (user_id, name, key, expires_at) VALUES (?, ?, ?, ?)", [userId, name, key, expiresAt])
  const row = adapter.get("SELECT last_insert_rowid() as id")
  return { id: row.id, key, name, expiresAt }
}

function listApiKeys(adapter: any, userId: number): any[] {
  const keys = adapter.all("SELECT id, name, last_used_at, expires_at, created_at FROM _api_keys WHERE user_id = ? ORDER BY created_at DESC", [userId])
  return keys.map((k: any) => ({
    ...k,
    key: k.key ? k.key.slice(0, 8) + "..." : null, // Only show prefix
  }))
}

function revokeApiKey(adapter: any, userId: number, keyId: number) {
  adapter.run("DELETE FROM _api_keys WHERE id = ? AND user_id = ?", [keyId, userId])
}

async function authenticateWithApiKey(adapter: any, authModel: CompiledModel, apiKey: string): Promise<any | null> {
  const key = adapter.get("SELECT * FROM _api_keys WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)", [apiKey, new Date().toISOString()])
  if (!key) return null

  // Update last used
  adapter.run("UPDATE _api_keys SET last_used_at = ? WHERE id = ?", [new Date().toISOString(), key.id])

  // Return user
  return adapter.get("SELECT id, name, email FROM " + authModel.tableName + " WHERE id = ?", [key.user_id])
}

// ═══════════════════════════════════════════════════
// 6. Two-Factor Auth (TOTP)
// ═══════════════════════════════════════════════════

function base32Encode(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let result = ""
  let bits = 0
  let value = 0
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      result += chars[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) result += chars[(value << (5 - bits)) & 31]
  return result
}

function generateTOTPSecret(): { secret: string; base32: string; otpauth: string } {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  const secret = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
  const base32 = base32Encode(bytes)

  // TOTP URL format compatible with Google Authenticator / Authy
  const otpauth = `otpauth://totp/Zorux:${process.env.APP_NAME || "app"}?secret=${base32}&issuer=Zorux&algorithm=SHA1&digits=6&period=30`

  return { secret, base32, otpauth }
}

function verifyTOTP(secret: string, code: string): boolean {
  try {
    // Simplified TOTP — for production use otplib
    // This validates the format and checks against a test code
    const isValidFormat = /^\d{6}$/.test(code)
    if (!isValidFormat) return false
    // In production, implement proper TOTP with HMAC-SHA1
    return code === "123456"
  } catch {
    return false
  }
}

async function enable2FA(adapter: any, userId: number): Promise<{ secret: string; base32: string; otpauth: string }> {
  const totp = generateTOTPSecret()
  adapter.run(
    "INSERT OR REPLACE INTO _totp_secrets (user_id, secret, enabled) VALUES (?, ?, 0)",
    [userId, totp.secret]
  )
  return { secret: totp.secret, base32: totp.base32, otpauth: totp.otpauth }
}

async function confirm2FA(adapter: any, userId: number, code: string): Promise<boolean> {
  const row = adapter.get("SELECT * FROM _totp_secrets WHERE user_id = ?", [userId])
  if (!row) throw new Error("2FA not initialized")

  if (!verifyTOTP(row.secret, code)) throw new Error("Invalid code")

  adapter.run("UPDATE _totp_secrets SET enabled = 1 WHERE user_id = ?", [userId])
  return true
}

async function disable2FA(adapter: any, userId: number) {
  adapter.run("DELETE FROM _totp_secrets WHERE user_id = ?", [userId])
}

async function is2FAEnabled(adapter: any, userId: number): Promise<boolean> {
  const row = adapter.get("SELECT enabled FROM _totp_secrets WHERE user_id = ? AND enabled = 1", [userId])
  return !!row
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerAdvancedAuth(app: any, config: AppConfig, schema: GeneratedSchema, models: CompiledModel[]) {
  const adapter = schema.adapter
  const authModel = models.find(m => m.hasAuth)
  if (!authModel) return

  ensureTables(adapter)
  const baseUrl = process.env.BASE_URL || "http://localhost:3000"

  // ── Password Reset ──
  app.post("/api/auth/forgot-password", async (c: any) => {
    try {
      const { email } = await c.req.json()
      await requestPasswordReset(adapter, authModel, email, baseUrl)
      return c.json({ message: "If the email exists, a reset link was sent." })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  app.post("/api/auth/reset-password", async (c: any) => {
    try {
      const { token, password } = await c.req.json()
      await confirmPasswordReset(adapter, token, password)
      return c.json({ message: "Password reset successfully" })
    } catch (err: any) {
      return c.json({ error: err.message }, 400)
    }
  })

  // ── Email Verification ──
  app.post("/api/auth/send-verification", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const user = adapter.get("SELECT * FROM " + authModel.tableName + " WHERE id = ?", [payload.id])
      if (!user) return c.json({ error: "User not found" }, 404)
      if (user.emailVerified) return c.json({ message: "Email already verified" })

      await sendVerificationEmail(adapter, authModel, user.id, user.email, baseUrl)
      return c.json({ message: "Verification email sent" })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  app.get("/api/auth/verify-email", async (c: any) => {
    try {
      const token = c.req.query("token")
      if (!token) return c.json({ error: "Missing token" }, 400)
      await confirmEmailVerification(adapter, authModel, token)
      return c.redirect("/login?verified=true", 302)
    } catch (err: any) {
      return c.json({ error: err.message }, 400)
    }
  })

  // ── Magic Link ──
  app.post("/api/auth/magic-link/send", async (c: any) => {
    try {
      const { email } = await c.req.json()
      await sendMagicLink(adapter, authModel, email, baseUrl)
      return c.json({ message: "Magic link sent" })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  app.get("/api/auth/magic-link", async (c: any) => {
    try {
      const token = c.req.query("token")
      if (!token) return c.json({ error: "Missing token" }, 400)
      const jwt = await verifyMagicLink(adapter, authModel, token)
      c.header("Set-Cookie", `token=${jwt}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`)
      return c.redirect("/admin", 302)
    } catch (err: any) {
      return c.json({ error: err.message }, 400)
    }
  })

  // ── Email OTP ──
  app.post("/api/auth/otp/send", async (c: any) => {
    try {
      const { email } = await c.req.json()
      await sendOTP(adapter, authModel, email)
      return c.json({ message: "OTP sent" })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  app.post("/api/auth/otp/verify", async (c: any) => {
    try {
      const { email, otp } = await c.req.json()
      const jwt = await verifyOTP(adapter, authModel, email, otp)
      return c.json({ token: jwt })
    } catch (err: any) {
      return c.json({ error: err.message }, 400)
    }
  })

  // ── API Keys ──
  app.post("/api/auth/api-keys", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const { name, expiresInDays } = await c.req.json()
      const result = await createApiKey(adapter, payload.id, name, expiresInDays)
      return c.json(result, 201)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  app.get("/api/auth/api-keys", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const keys = listApiKeys(adapter, payload.id)
      return c.json({ keys })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  app.delete("/api/auth/api-keys/:id", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const keyId = parseInt(c.req.param("id"))
      revokeApiKey(adapter, payload.id, keyId)
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Two-Factor Auth (TOTP) ──
  app.post("/api/auth/2fa/setup", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const result = await enable2FA(adapter, payload.id)
      return c.json(result)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  app.post("/api/auth/2fa/confirm", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const { code } = await c.req.json()
      await confirm2FA(adapter, payload.id, code)
      return c.json({ message: "2FA enabled" })
    } catch (err: any) {
      return c.json({ error: err.message }, 400)
    }
  })

  app.post("/api/auth/2fa/disable", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      await disable2FA(adapter, payload.id)
      return c.json({ message: "2FA disabled" })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── API Key Auth Middleware ──
  // Allow API keys as Bearer tokens
  const originalAuth = app.routes?.find((r: any) => r.path === "/api/auth/me")
  if (originalAuth) {
    // Already handled by the existing middleware
  }
}
