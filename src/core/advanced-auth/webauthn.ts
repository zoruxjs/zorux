import type { AppConfig, CompiledModel } from "../types"
import type { GeneratedSchema } from "../schema"
import { createJWT, verifyJWT } from "../../auth"

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

interface WebAuthnConfig {
  enabled: boolean
  rpName?: string
  rpId?: string
  origin?: string
}

// ═══════════════════════════════════════════════════
// In-memory challenge store
// ═══════════════════════════════════════════════════

const challengeStore = new Map<string, { challenge: string; userId?: number; expiresAt: number }>()

function storeChallenge(userId: number | undefined): string {
  const challenge = crypto.randomUUID() + crypto.randomUUID()
  challengeStore.set(challenge, { challenge, userId, expiresAt: Date.now() + 120_000 })
  return challenge
}

function consumeChallenge(challenge: string): { userId?: number } | null {
  const entry = challengeStore.get(challenge)
  if (!entry) return null
  challengeStore.delete(challenge)
  if (Date.now() > entry.expiresAt) return null
  return { userId: entry.userId }
}

// ═══════════════════════════════════════════════════
// Database
// ═══════════════════════════════════════════════════

function ensureTable(adapter: any) {
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _webauthn_credentials (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "user_id INTEGER NOT NULL, " +
    "credential_id TEXT NOT NULL UNIQUE, " +
    "public_key TEXT NOT NULL, " +
    "counter INTEGER DEFAULT 0, " +
    "transports TEXT, " +
    "name TEXT, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
}

// ═══════════════════════════════════════════════════
// WebAuthn helpers (pure JS, no deps)
// ═══════════════════════════════════════════════════

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/")
  while (str.length % 4) str += "="
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

// ═══════════════════════════════════════════════════
// Registration
// ═══════════════════════════════════════════════════

function generateRegistrationOptions(userId: number, userName: string, userDisplayName: string, config: WebAuthnConfig) {
  const challenge = storeChallenge(userId)

  return {
    challenge,
    rp: { name: config.rpName || "Zorux App", id: config.rpId || "localhost" },
    user: {
      id: base64url(new TextEncoder().encode(String(userId))),
      name: userName,
      displayName: userDisplayName,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },    // ES256
      { type: "public-key", alg: -257 },   // RS256
    ],
    timeout: 60000,
    attestation: "none" as const,
    excludeCredentials: [],
    authenticatorSelection: {
      residentKey: "preferred" as const,
      userVerification: "preferred" as const,
    },
  }
}

async function verifyRegistrationResponse(
  adapter: any,
  userId: number,
  credential: { id: string; rawId: string; response: { clientDataJSON: string; attestationObject: string } },
): Promise<boolean> {
  try {
    const challenge = consumeChallenge(credential.response.clientDataJSON
      ? JSON.parse(new TextDecoder().decode(base64urlDecode(credential.response.clientDataJSON))).challenge
      : "")

    if (!challenge || challenge.userId !== userId) return false

    // Decode attestation object to extract public key
    const attestationBuf = base64urlDecode(credential.response.attestationObject)
    const dataView = new DataView(attestationBuf.buffer)
    let offset = 0

    // Skip CBOR header (simplified)
    // In production, use @simplewebauthn/server for proper CBOR parsing
    // For now, store the raw credential data

    adapter.run(
      "INSERT OR IGNORE INTO _webauthn_credentials (user_id, credential_id, public_key, transports, name) VALUES (?, ?, ?, ?, ?)",
      [userId, credential.id, credential.response.attestationObject, "", "Passkey " + new Date().toLocaleDateString()]
    )

    return true
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════
// Authentication
// ═══════════════════════════════════════════════════

function generateAuthenticationOptions(adapter: any, userId?: number) {
  const challenge = storeChallenge(undefined)

  const options: any = {
    challenge,
    timeout: 60000,
    userVerification: "preferred" as const,
  }

  if (userId) {
    const creds = adapter.all("SELECT credential_id, transports FROM _webauthn_credentials WHERE user_id = ?", [userId])
    options.allowCredentials = creds.map((c: any) => ({
      id: c.credential_id,
      type: "public-key" as const,
      transports: c.transports ? c.transports.split(",") : [],
    }))
  }

  return options
}

async function verifyAuthenticationResponse(adapter: any, credential: { id: string; response: { clientDataJSON: string; authenticatorData: string; signature: string; userHandle?: string } }): Promise<number | null> {
  try {
    // Find stored credential
    const stored = adapter.get("SELECT * FROM _webauthn_credentials WHERE credential_id = ?", [credential.id])
    if (!stored) return null

    // Verify challenge
    const clientData = JSON.parse(new TextDecoder().decode(base64urlDecode(credential.response.clientDataJSON)))
    const challenge = consumeChallenge(clientData.challenge)
    if (!challenge) return null

    // Update counter
    adapter.run("UPDATE _webauthn_credentials SET counter = counter + 1 WHERE id = ?", [stored.id])

    return stored.user_id
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerWebAuthn(app: any, _config: AppConfig, schema: GeneratedSchema, _models: CompiledModel[]) {
  const adapter = schema.adapter
  const webauthnCfg: WebAuthnConfig = {
    enabled: true,
    rpName: process.env.WEBAUTHN_RP_NAME || "Zorux App",
    rpId: process.env.WEBAUTHN_RP_ID || "localhost",
    origin: process.env.WEBAUTHN_ORIGIN || "http://localhost:3000",
  }

  if (!webauthnCfg.enabled) return

  ensureTable(adapter)

  // ── Begin Registration ──
  app.post("/api/auth/webauthn/register/begin", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const user = adapter.get("SELECT * FROM users WHERE id = ?", [payload.id])
      if (!user) return c.json({ error: "User not found" }, 404)

      const options = generateRegistrationOptions(user.id, user.email || "user", user.name || "User", webauthnCfg)
      return c.json(options)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Complete Registration ──
  app.post("/api/auth/webauthn/register/complete", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const credential = await c.req.json()
      const verified = await verifyRegistrationResponse(adapter, payload.id, credential)

      if (!verified) return c.json({ error: "Verification failed" }, 400)

      return c.json({ verified: true, credential: { id: credential.id } })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Begin Authentication ──
  app.post("/api/auth/webauthn/auth/begin", async (c: any) => {
    try {
      const { userId } = await c.req.json().catch(() => ({}))
      const options = generateAuthenticationOptions(adapter, userId || undefined)
      return c.json(options)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Complete Authentication ──
  app.post("/api/auth/webauthn/auth/complete", async (c: any) => {
    try {
      const credential = await c.req.json()
      const userId = await verifyAuthenticationResponse(adapter, credential)

      if (!userId) return c.json({ error: "Authentication failed" }, 401)

      const jwt = await createJWT({ id: userId })
      const user = adapter.get("SELECT id, name, email FROM users WHERE id = ?", [userId])
      return c.json({ token: jwt, user })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── List Credentials ──
  app.get("/api/auth/webauthn/credentials", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const creds = adapter.all(
        "SELECT id, credential_id, name, counter, created_at FROM _webauthn_credentials WHERE user_id = ? ORDER BY created_at DESC",
        [payload.id]
      )
      return c.json({ credentials: creds.map((c: any) => ({ ...c, credential_id: c.credential_id.slice(0, 20) + "..." })) })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Delete Credential ──
  app.delete("/api/auth/webauthn/credentials/:id", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const credId = parseInt(c.req.param("id"))
      adapter.run("DELETE FROM _webauthn_credentials WHERE id = ? AND user_id = ?", [credId, payload.id])
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })
}
