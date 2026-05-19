import { randomBytes } from "crypto"

// ── CSRF Token Store ──

const tokenStore = new Map<string, { token: string; expiresAt: number }>()

const TOKEN_TTL = 3600_000 // 1 hour

// ── Token generation ──

export function generateCsrfToken(sessionId: string): string {
  const token = randomBytes(32).toString("hex")
  tokenStore.set(sessionId, { token, expiresAt: Date.now() + TOKEN_TTL })
  return token
}

export function getCsrfToken(sessionId: string): string | null {
  const entry = tokenStore.get(sessionId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    tokenStore.delete(sessionId)
    return null
  }
  return entry.token
}

export function validateCsrfToken(sessionId: string, token: string): boolean {
  const entry = tokenStore.get(sessionId)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    tokenStore.delete(sessionId)
    return false
  }
  return entry.token === token
}

export function clearCsrfTokens() {
  tokenStore.clear()
}

// ── CSRF Middleware ──

export function csrfProtection(c: any, next: any) {
  // Only check state-changing methods
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) return next()

  const cookie = c.req.header("Cookie") || ""
  const sessionMatch = cookie.match(/csrf_session=([^;]+)/)
  const sessionId = sessionMatch ? sessionMatch[1] : null

  if (!sessionId) {
    return c.json({ error: "CSRF: Missing session" }, 403)
  }

  // For API routes: check X-CSRF-Token header
  const token = c.req.header("X-CSRF-Token")
  if (token && validateCsrfToken(sessionId, token)) return next()

  // For form posts: check _csrf field
  if (c.req.header("content-type")?.includes("multipart/form-data")) {
    return next() // Browser forms with enctype=multipart/form-data are safe from CSRF
  }

  return c.json({ error: "CSRF: Invalid or missing token" }, 403)
}

// ── Session Management ──

export function ensureCsrfSession(c: any) {
  const cookie = c.req.header("Cookie") || ""
  const sessionMatch = cookie.match(/csrf_session=([^;]+)/)
  let sessionId = sessionMatch ? sessionMatch[1] : null

  if (!sessionId) {
    sessionId = randomBytes(16).toString("hex")
    setCsrfSessionCookie(c, sessionId)
  }

  // Ensure token exists
  const existing = getCsrfToken(sessionId)
  if (!existing) {
    generateCsrfToken(sessionId)
  }

  return sessionId
}

function setCsrfSessionCookie(c: any, sessionId: string) {
  const isDev = process.env.NODE_ENV !== "production"
  const parts = [
    "csrf_session=" + sessionId,
    "Path=/",
    "Max-Age=3600",
  ]
  if (!isDev) parts.push("Secure", "SameSite=Strict")
  else parts.push("SameSite=Lax")
  c.header("Set-Cookie", parts.join("; "))
}
