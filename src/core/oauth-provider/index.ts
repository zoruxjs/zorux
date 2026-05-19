import type { AppConfig, CompiledModel } from "../types"
import type { GeneratedSchema } from "../schema"
import { createJWT, verifyJWT } from "../../auth"
import { randomBytes } from "crypto"

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

interface OAuthClient {
  id: number
  client_id: string
  client_secret: string
  name: string
  redirect_uris: string
  user_id: number
  created_at: string
}

// ═══════════════════════════════════════════════════
// Database
// ═══════════════════════════════════════════════════

function ensureTables(adapter: any) {
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _oauth_clients (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "client_id TEXT NOT NULL UNIQUE, " +
    "client_secret TEXT NOT NULL, " +
    "name TEXT NOT NULL, " +
    "redirect_uris TEXT NOT NULL DEFAULT '', " +
    "user_id INTEGER NOT NULL, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _oauth_codes (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "code TEXT NOT NULL UNIQUE, " +
    "client_id TEXT NOT NULL, " +
    "user_id INTEGER NOT NULL, " +
    "redirect_uri TEXT NOT NULL, " +
    "scope TEXT DEFAULT '', " +
    "used INTEGER DEFAULT 0, " +
    "expires_at TEXT NOT NULL, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _oauth_tokens (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "access_token TEXT NOT NULL UNIQUE, " +
    "refresh_token TEXT UNIQUE, " +
    "client_id TEXT NOT NULL, " +
    "user_id INTEGER NOT NULL, " +
    "scope TEXT DEFAULT '', " +
    "expires_at TEXT NOT NULL, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
}

// ═══════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════

function generateId(): string {
  const bytes = randomBytes(24)
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
}

function generateSecret(): string {
  const bytes = randomBytes(32)
  return "Zorux_secret_" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
}

function generateCode(): string {
  return randomBytes(32).toString("base64url")
}

function generateAccessToken(): string {
  return "Zorux_at_" + generateId()
}

function validateRedirectUri(registeredUris: string, uri: string): boolean {
  return registeredUris.split(",").map(s => s.trim()).includes(uri)
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri)
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "Zorux:"
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerOAuthProvider(app: any, _config: AppConfig, schema: GeneratedSchema, _models: CompiledModel[]) {
  const adapter = schema.adapter
  ensureTables(adapter)

  const baseUrl = process.env.BASE_URL || "http://localhost:3000"

  // ═══════════════════════════════════════════════════
  // Client Management
  // ═══════════════════════════════════════════════════

  // POST /api/oauth/register — create OAuth client
  app.post("/api/oauth/register", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const { name, redirectUris } = await c.req.json()
      if (!name) return c.json({ error: "Name is required" }, 400)

      const uris = Array.isArray(redirectUris) ? redirectUris : [redirectUris || ""]
      const validUris = uris.filter((u: string) => isValidRedirectUri(u))
      if (validUris.length === 0) return c.json({ error: "At least one valid redirect URI is required" }, 400)

      const clientId = generateId()
      const clientSecret = generateSecret()

      adapter.run(
        "INSERT INTO _oauth_clients (client_id, client_secret, name, redirect_uris, user_id) VALUES (?, ?, ?, ?, ?)",
        [clientId, clientSecret, name, validUris.join(","), payload.id]
      )

      return c.json({
        client_id: clientId,
        client_secret: clientSecret,
        name,
        redirect_uris: validUris,
      }, 201)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // GET /api/oauth/clients — list clients
  app.get("/api/oauth/clients", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const clients = adapter.all(
        "SELECT id, client_id, name, redirect_uris, created_at FROM _oauth_clients WHERE user_id = ? ORDER BY created_at DESC",
        [payload.id]
      )
      return c.json({ clients })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // DELETE /api/oauth/clients/:id — delete client
  app.delete("/api/oauth/clients/:id", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const clientId = parseInt(c.req.param("id"))
      adapter.run("DELETE FROM _oauth_clients WHERE id = ? AND user_id = ?", [clientId, payload.id])
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ═══════════════════════════════════════════════════
  // OAuth 2.0 Authorization Code Flow
  // ═══════════════════════════════════════════════════

  // GET /api/oauth/authorize — authorization endpoint
  app.get("/api/oauth/authorize", async (c: any) => {
    try {
      const clientId = c.req.query("client_id")
      const redirectUri = c.req.query("redirect_uri")
      const responseType = c.req.query("response_type")
      const state = c.req.query("state")
      const scope = c.req.query("scope") || "openid profile email"

      if (!clientId || !redirectUri || responseType !== "code") {
        return c.redirect(redirectUri + "?error=invalid_request" + (state ? "&state=" + state : ""), 302)
      }

      const client = adapter.get("SELECT * FROM _oauth_clients WHERE client_id = ?", [clientId])
      if (!client || !validateRedirectUri(client.redirect_uris, redirectUri)) {
        return c.redirect(redirectUri + "?error=unauthorized_client" + (state ? "&state=" + state : ""), 302)
      }

      // Check if user is authenticated
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
        || (c.req.header("Cookie") || "").match(/token=([^;]+)/)?.[1]

      if (!token) {
        // Redirect to login with callback
        const loginUrl = `/login?redirect=${encodeURIComponent("/api/oauth/authorize?" + Object.entries(c.req.queries()).flatMap(([k, v]) => v.map((val: string) => `${k}=${encodeURIComponent(val)}`)).join("&"))}`
        return c.redirect(loginUrl, 302)
      }

      const payload = await verifyJWT(token)
      if (!payload) return c.redirect(redirectUri + "?error=access_denied" + (state ? "&state=" + state : ""), 302)

      // Generate authorization code
      const code = generateCode()
      const expiresAt = new Date(Date.now() + 600_000).toISOString() // 10 min

      adapter.run(
        "INSERT INTO _oauth_codes (code, client_id, user_id, redirect_uri, scope, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
        [code, clientId, payload.id, redirectUri, scope, expiresAt]
      )

      return c.redirect(redirectUri + "?code=" + code + (state ? "&state=" + state : ""), 302)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // POST /api/oauth/token — token exchange
  app.post("/api/oauth/token", async (c: any) => {
    try {
      let body: any
      const ct = (c.req.header("content-type") || "").toLowerCase()

      if (ct.includes("application/x-www-form-urlencoded")) {
        const form = await c.req.parseBody()
        body = form
      } else {
        body = await c.req.json()
      }

      const grantType = body.grant_type || "authorization_code"

      if (grantType === "authorization_code") {
        return handleAuthCodeGrant(adapter, body, baseUrl)
      }

      if (grantType === "refresh_token") {
        return handleRefreshToken(adapter, body)
      }

      return c.json({ error: "unsupported_grant_type" }, 400)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ═══════════════════════════════════════════════════
  // OIDC Endpoints
  // ═══════════════════════════════════════════════════

  // GET /api/oauth/userinfo — user info
  app.get("/api/oauth/userinfo", async (c: any) => {
    try {
      const auth = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!auth) return c.json({ error: "unauthorized" }, 401)

      const tok = adapter.get("SELECT * FROM _oauth_tokens WHERE access_token = ? AND expires_at > ?", [auth, new Date().toISOString()])
      if (!tok) return c.json({ error: "invalid_token" }, 401)

      const user = adapter.get("SELECT id, name, email FROM users WHERE id = ?", [tok.user_id])
      if (!user) return c.json({ error: "user_not_found" }, 404)

      return c.json({
        sub: String(user.id),
        name: user.name || "",
        email: user.email || "",
        email_verified: true,
      })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // GET /api/oauth/.well-known/openid-configuration — OIDC discovery
  app.get("/api/oauth/.well-known/openid-configuration", (c: any) => {
    return c.json({
      issuer: baseUrl,
      authorization_endpoint: baseUrl + "/api/oauth/authorize",
      token_endpoint: baseUrl + "/api/oauth/token",
      userinfo_endpoint: baseUrl + "/api/oauth/userinfo",
      jwks_uri: baseUrl + "/api/oauth/.well-known/jwks.json",
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["HS256"],
      scopes_supported: ["openid", "profile", "email"],
      claims_supported: ["sub", "name", "email", "email_verified"],
    })
  })

  // GET /api/oauth/.well-known/jwks.json — JWKS (simplified)
  app.get("/api/oauth/.well-known/jwks.json", (c: any) => {
    return c.json({ keys: [] })
  })
}

// ═══════════════════════════════════════════════════
// Token Grant Handlers
// ═══════════════════════════════════════════════════

async function handleAuthCodeGrant(adapter: any, body: any, baseUrl: string): Promise<Response> {
  const { code, client_id, client_secret, redirect_uri } = body

  if (!code || !client_id || !client_secret) {
    return Response.json({ error: "invalid_request" }, { status: 400 })
  }

  const client = adapter.get("SELECT * FROM _oauth_clients WHERE client_id = ? AND client_secret = ?", [client_id, client_secret])
  if (!client) {
    return Response.json({ error: "invalid_client" }, { status: 401 })
  }

  const authCode = adapter.get("SELECT * FROM _oauth_codes WHERE code = ? AND client_id = ? AND used = 0 AND expires_at > ?", [code, client_id, new Date().toISOString()])
  if (!authCode) {
    return Response.json({ error: "invalid_grant" }, { status: 400 })
  }

  if (redirect_uri && authCode.redirect_uri !== redirect_uri) {
    return Response.json({ error: "invalid_grant" }, { status: 400 })
  }

  // Mark code as used
  adapter.run("UPDATE _oauth_codes SET used = 1 WHERE id = ?", [authCode.id])

  // Generate tokens
  const accessToken = generateAccessToken()
  const refreshToken = generateId()
  const expiresAt = new Date(Date.now() + 3600_000).toISOString() // 1 hour

  adapter.run(
    "INSERT INTO _oauth_tokens (access_token, refresh_token, client_id, user_id, scope, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [accessToken, refreshToken, client_id, authCode.user_id, authCode.scope, expiresAt]
  )

  const result: any = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshToken,
  }

  // If scope includes openid, generate id_token
  if (authCode.scope.includes("openid")) {
    const user = adapter.get("SELECT id, name, email FROM users WHERE id = ?", [authCode.user_id])
    const idToken = await createJWT({
      sub: String(authCode.user_id),
      iss: baseUrl,
      aud: client_id,
      name: user?.name || "",
      email: user?.email || "",
    })
    result.id_token = idToken
  }

  return Response.json(result, { status: 200 })
}

async function handleRefreshToken(adapter: any, body: any): Promise<Response> {
  const { refresh_token, client_id, client_secret } = body

  if (!refresh_token) {
    return Response.json({ error: "invalid_request" }, { status: 400 })
  }

  if (client_id && client_secret) {
    const client = adapter.get("SELECT * FROM _oauth_clients WHERE client_id = ? AND client_secret = ?", [client_id, client_secret])
    if (!client) {
      return Response.json({ error: "invalid_client" }, { status: 401 })
    }
  }

  const tok = adapter.get("SELECT * FROM _oauth_tokens WHERE refresh_token = ? AND expires_at > ?", [refresh_token, new Date().toISOString()])
  if (!tok) {
    return Response.json({ error: "invalid_grant" }, { status: 400 })
  }

  // Revoke old, issue new
  adapter.run("DELETE FROM _oauth_tokens WHERE id = ?", [tok.id])

  const accessToken = generateAccessToken()
  const newRefresh = generateId()
  const expiresAt = new Date(Date.now() + 3600_000).toISOString()

  adapter.run(
    "INSERT INTO _oauth_tokens (access_token, refresh_token, client_id, user_id, scope, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [accessToken, newRefresh, tok.client_id, tok.user_id, tok.scope, expiresAt]
  )

  return Response.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: newRefresh,
  }, { status: 200 })
}
