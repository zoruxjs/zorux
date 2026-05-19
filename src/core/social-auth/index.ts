import type { AppConfig, CompiledModel } from "../types"
import type { GeneratedSchema } from "../schema"

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface OAuthProviderConfig {
  clientId: string
  clientSecret: string
  redirectUri?: string
}

export interface SocialAuthConfig {
  [provider: string]: OAuthProviderConfig
}

interface ProviderAccount {
  id: number
  userId: number
  provider: string
  providerAccountId: string
  email: string
  name: string
  avatar?: string
  createdAt: string
}

// ═══════════════════════════════════════════════════
// OAuth URLs and token exchange
// ═══════════════════════════════════════════════════

const PROVIDER_URLS: Record<string, { auth: string; token: string; user: string; scope: string; userFn?: string }> = {
  google:       { auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", user: "https://www.googleapis.com/oauth2/v2/userinfo", scope: "openid email profile" },
  github:       { auth: "https://github.com/login/oauth/authorize", token: "https://github.com/login/oauth/access_token", user: "https://api.github.com/user", scope: "read:user user:email", userFn: "github" },
  discord:      { auth: "https://discord.com/api/oauth2/authorize", token: "https://discord.com/api/oauth2/token", user: "https://discord.com/api/users/@me", scope: "identify email", userFn: "discord" },
  apple:        { auth: "https://appleid.apple.com/auth/authorize", token: "https://appleid.apple.com/auth/token", user: "https://appleid.apple.com/auth/userinfo", scope: "name email" },
  atlassian:    { auth: "https://auth.atlassian.com/authorize", token: "https://auth.atlassian.com/oauth/token", user: "https://api.atlassian.com/me", scope: "read:me email" },
  cognito:      { auth: "https://{pool}.auth.{region}.amazoncognito.com/oauth2/authorize", token: "https://{pool}.auth.{region}.amazoncognito.com/oauth2/token", user: "https://{pool}.auth.{region}.amazoncognito.com/oauth2/userInfo", scope: "openid email profile" },
  dropbox:      { auth: "https://www.dropbox.com/oauth2/authorize", token: "https://api.dropboxapi.com/oauth2/token", user: "https://api.dropboxapi.com/2/users/get_current_account", scope: "account_info.read" },
  facebook:     { auth: "https://www.facebook.com/v19.0/dialog/oauth", token: "https://graph.facebook.com/v19.0/oauth/access_token", user: "https://graph.facebook.com/me?fields=id,name,email,picture", scope: "email public_profile" },
  figma:        { auth: "https://www.figma.com/oauth", token: "https://www.figma.com/api/oauth/token", user: "https://api.figma.com/v1/me", scope: "file_read" },
  gitlab:       { auth: "https://gitlab.com/oauth/authorize", token: "https://gitlab.com/oauth/token", user: "https://gitlab.com/api/v4/user", scope: "read_user" },
  huggingface:  { auth: "https://huggingface.co/oauth/authorize", token: "https://huggingface.co/oauth/token", user: "https://huggingface.co/api/oauth/userinfo", scope: "openid profile email" },
  kakao:        { auth: "https://kauth.kakao.com/oauth/authorize", token: "https://kauth.kakao.com/oauth/token", user: "https://kapi.kakao.com/v2/user/me", scope: "account_email profile" },
  kick:         { auth: "https://id.kick.com/oauth/authorize", token: "https://id.kick.com/oauth/token", user: "https://id.kick.com/api/user", scope: "user:read email" },
  line:         { auth: "https://access.line.me/oauth2/v2.1/authorize", token: "https://api.line.me/oauth2/v2.1/token", user: "https://api.line.me/v2/profile", scope: "profile openid email" },
  linear:       { auth: "https://linear.app/oauth/authorize", token: "https://api.linear.app/oauth/token", user: "https://api.linear.app/graphql", scope: "read write" },
  linkedin:     { auth: "https://www.linkedin.com/oauth/v2/authorization", token: "https://www.linkedin.com/oauth/v2/accessToken", user: "https://api.linkedin.com/v2/userinfo", scope: "openid email profile" },
  microsoft:    { auth: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", token: "https://login.microsoftonline.com/common/oauth2/v2.0/token", user: "https://graph.microsoft.com/v1.0/me", scope: "User.Read Mail.Read" },
  naver:        { auth: "https://nid.naver.com/oauth2.0/authorize", token: "https://nid.naver.com/oauth2.0/token", user: "https://openapi.naver.com/v1/nid/me", scope: "email name" },
  notion:       { auth: "https://api.notion.com/v1/oauth/authorize", token: "https://api.notion.com/v1/oauth/token", user: "https://api.notion.com/v1/users/me", scope: "" },
  paybin:       { auth: "https://paybin.io/oauth/authorize", token: "https://paybin.io/oauth/token", user: "https://paybin.io/api/user", scope: "read" },
  paypal:       { auth: "https://www.paypal.com/oauth2/authorize", token: "https://api-m.paypal.com/v1/oauth2/token", user: "https://api-m.paypal.com/v1/identity/oauth2/userinfo", scope: "openid email" },
  polar:        { auth: "https://polar.sh/oauth/authorize", token: "https://polar.sh/oauth/token", user: "https://polar.sh/api/v1/users/me", scope: "openid email" },
  railway:      { auth: "https://railway.app/oauth/authorize", token: "https://railway.app/api/oauth/token", user: "https://railway.app/api/user", scope: "read" },
  reddit:       { auth: "https://www.reddit.com/api/v1/authorize", token: "https://www.reddit.com/api/v1/access_token", user: "https://oauth.reddit.com/api/v1/me", scope: "identity" },
  roblox:       { auth: "https://apis.roblox.com/oauth/v1/authorize", token: "https://apis.roblox.com/oauth/v1/token", user: "https://apis.roblox.com/oauth/v1/userinfo", scope: "openid email profile" },
  salesforce:   { auth: "https://login.salesforce.com/services/oauth2/authorize", token: "https://login.salesforce.com/services/oauth2/token", user: "https://login.salesforce.com/services/oauth2/userinfo", scope: "id email profile" },
  slack:        { auth: "https://slack.com/oauth/v2/authorize", token: "https://slack.com/api/oauth.v2.access", user: "https://slack.com/api/users.identity", scope: "identity.email identity.avatar identity.basic" },
  spotify:      { auth: "https://accounts.spotify.com/authorize", token: "https://accounts.spotify.com/api/token", user: "https://api.spotify.com/v1/me", scope: "user-read-email user-read-private" },
  tiktok:       { auth: "https://www.tiktok.com/v2/auth/authorize", token: "https://open.tiktokapis.com/v2/oauth/token", user: "https://open.tiktokapis.com/v2/user/info", scope: "user.info.basic user.info.email" },
  twitch:       { auth: "https://id.twitch.tv/oauth2/authorize", token: "https://id.twitch.tv/oauth2/token", user: "https://api.twitch.tv/helix/users", scope: "user:read:email" },
  twitter:      { auth: "https://twitter.com/i/oauth2/authorize", token: "https://api.twitter.com/2/oauth2/token", user: "https://api.twitter.com/2/users/me", scope: "tweet.read users.read" },
  vercel:       { auth: "https://vercel.com/oauth/authorize", token: "https://api.vercel.com/oauth/access_token", user: "https://api.vercel.com/www/user", scope: "" },
  vk:           { auth: "https://id.vk.com/authorize", token: "https://id.vk.com/oauth2/token", user: "https://api.vk.com/method/users.get", scope: "email" },
  wechat:       { auth: "https://open.weixin.qq.com/connect/qrconnect", token: "https://api.weixin.qq.com/sns/oauth2/access_token", user: "https://api.weixin.qq.com/sns/userinfo", scope: "snsapi_login" },
  zoom:         { auth: "https://zoom.us/oauth/authorize", token: "https://zoom.us/oauth/token", user: "https://api.zoom.us/v2/users/me", scope: "user:read email" },
}

// ═══════════════════════════════════════════════════
// State management (CSRF protection for OAuth)
// ═══════════════════════════════════════════════════

const stateStore = new Map<string, { provider: string; redirectTo: string; expiresAt: number }>()

function generateState(provider: string, redirectTo = "/admin"): string {
  const state = crypto.randomUUID()
  stateStore.set(state, { provider, redirectTo, expiresAt: Date.now() + 600_000 })
  // Cleanup old states every 50 inserts
  if (stateStore.size > 100) {
    const now = Date.now()
    for (const [k, v] of stateStore) {
      if (now > v.expiresAt) stateStore.delete(k)
    }
  }
  return state
}

function consumeState(state: string): { provider: string; redirectTo: string } | null {
  const entry = stateStore.get(state)
  if (!entry) return null
  stateStore.delete(state)
  if (Date.now() > entry.expiresAt) return null
  return entry
}

// ═══════════════════════════════════════════════════
// Database helpers
// ═══════════════════════════════════════════════════

function ensureSocialTable(adapter: any) {
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _social_accounts (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "user_id INTEGER NOT NULL, " +
    "provider TEXT NOT NULL, " +
    "provider_account_id TEXT NOT NULL, " +
    "email TEXT, " +
    "name TEXT, " +
    "avatar TEXT, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP, " +
    "UNIQUE(provider, provider_account_id)" +
    ")"
  )
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _sessions (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "user_id INTEGER NOT NULL, " +
    "refresh_token TEXT NOT NULL UNIQUE, " +
    "device_name TEXT DEFAULT '', " +
    "ip TEXT DEFAULT '', " +
    "expires_at TEXT NOT NULL, " +
    "last_active_at TEXT, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
}

function findProviderAccount(adapter: any, provider: string, providerAccountId: string): any {
  return adapter.get("SELECT * FROM _social_accounts WHERE provider = ? AND provider_account_id = ?", [provider, providerAccountId])
}

function findAccountsByUser(adapter: any, userId: number): any[] {
  return adapter.all("SELECT * FROM _social_accounts WHERE user_id = ?", [userId])
}

function createProviderAccount(adapter: any, userId: number, provider: string, accountId: string, email: string, name: string, avatar?: string): void {
  adapter.run(
    "INSERT OR IGNORE INTO _social_accounts (user_id, provider, provider_account_id, email, name, avatar) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, provider, accountId, email, name, avatar || null],
  )
}

// ═══════════════════════════════════════════════════
// User creation/lookup
// ═══════════════════════════════════════════════════

async function findOrCreateUser(adapter: any, authModel: CompiledModel, provider: string, profile: { id: string; email: string; name: string; avatar?: string }): Promise<{ id: number; isNew: boolean }> {
  // Check if this provider account exists
  const existing = findProviderAccount(adapter, provider, profile.id)
  if (existing) {
    return { id: existing.user_id, isNew: false }
  }

  // Check if user with this email exists
  const col = adapter.collection(authModel.tableName, authModel)
  const existingUser = await col.findBy("email", profile.email)
  if (existingUser) {
    // Link provider to existing user
    createProviderAccount(adapter, existingUser.id, provider, profile.id, profile.email, profile.name, profile.avatar)
    return { id: existingUser.id, isNew: false }
  }

  // Create new user
  const user = await col.insert({
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar || null,
    emailVerified: new Date().toISOString(),
  })

  if (user?.id) {
    createProviderAccount(adapter, user.id, provider, profile.id, profile.email, profile.name, profile.avatar)
  }

  return { id: user?.id, isNew: true }
}

// ═══════════════════════════════════════════════════
// JWT & Session management
// ═══════════════════════════════════════════════════

import { createJWT as createKaiJWT, verifyJWT } from "../../auth"

function generateRefreshToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
}

function createSession(adapter: any, userId: number, deviceName?: string, ip?: string): { refreshToken: string; expiresAt: string } {
  const refreshToken = generateRefreshToken()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  adapter.run("INSERT INTO _sessions (user_id, refresh_token, device_name, ip, expires_at, last_active_at) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, refreshToken, deviceName || "", ip || "", expiresAt, new Date().toISOString()])
  return { refreshToken, expiresAt }
}

function findSession(adapter: any, refreshToken: string): any {
  const session = adapter.get("SELECT * FROM _sessions WHERE refresh_token = ?", [refreshToken])
  if (!session) return null
  if (new Date(session.expires_at) < new Date()) {
    adapter.run("DELETE FROM _sessions WHERE id = ?", [session.id])
    return null
  }
  return session
}

async function issueTokens(adapter: any, userId: number, deviceName?: string, ip?: string): Promise<{ token: string; refreshToken: string }> {
  const token = await createKaiJWT({ id: userId })
  const { refreshToken } = createSession(adapter, userId, deviceName, ip)
  return { token, refreshToken }
}

// ═══════════════════════════════════════════════════
// Profile fetching
// ═══════════════════════════════════════════════════

async function fetchProfile(provider: string, accessToken: string): Promise<{ id: string; email: string; name: string; avatar?: string }> {
  const urls = PROVIDER_URLS[provider]
  if (!urls) throw new Error("Unknown provider: " + provider)

  const headers: Record<string, string> = { Authorization: "Bearer " + accessToken }
  if (["github", "gitlab", "slack"].includes(provider)) headers["Accept"] = "application/json"

  const res = await fetch(urls.user, { headers })
  let data: any = {}
  try { data = await res.json() } catch { throw new Error("Failed to fetch profile from " + provider) }

  switch (provider) {
    case "google":        return { id: String(data.id), email: data.email || "", name: data.name || "", avatar: data.picture }
    case "github": {
      if (!data.email) {
        const eRes = await fetch("https://api.github.com/user/emails", { headers })
        const emails = await eRes.json().catch(() => [])
        const primary = emails.find((e: any) => e.primary)
        data.email = primary?.email || data.email || ""
      }
      return { id: String(data.id), email: data.email, name: data.name || data.login, avatar: data.avatar_url }
    }
    case "discord":       return { id: data.id, email: data.email || "", name: data.username || "", avatar: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : undefined }
    case "apple":         return { id: String(data.sub), email: data.email || "", name: data.name || "", avatar: undefined }
    case "atlassian":     return { id: data.account_id || String(data.sub), email: data.email || "", name: data.name || "", avatar: data.picture }
    case "facebook":      return { id: String(data.id), email: data.email || "", name: data.name || "", avatar: data.picture?.data?.url }
    case "figma":         return { id: String(data.id), email: data.email || "", name: data.handle || data.email || "", avatar: data.img_url }
    case "gitlab":        return { id: String(data.id), email: data.email || "", name: data.name || data.username, avatar: data.avatar_url }
    case "linkedin":      return { id: String(data.sub), email: data.email || "", name: data.name || "", avatar: data.picture }
    case "microsoft":     return { id: String(data.id), email: data.mail || data.userPrincipalName || "", name: data.displayName || "", avatar: undefined }
    case "slack":         return { id: data.user?.id || String(data.sub), email: data.user?.email || "", name: data.user?.name || "", avatar: data.user?.image_192 }
    case "spotify":       return { id: String(data.id), email: data.email || "", name: data.display_name || "", avatar: data.images?.[0]?.url }
    case "twitch":        return { id: data.data?.[0]?.id || String(data.sub), email: data.data?.[0]?.email || "", name: data.data?.[0]?.display_name || "", avatar: data.data?.[0]?.profile_image_url }
    case "twitter":       return { id: String(data.data?.id || data.sub), email: "", name: data.data?.name || "", avatar: data.data?.profile_image_url }
    case "dropbox":       return { id: String(data.account_id), email: data.email || "", name: data.name?.display_name || "", avatar: undefined }
    case "kakao":         return { id: String(data.id), email: data.kakao_account?.email || "", name: data.properties?.nickname || "", avatar: data.properties?.profile_image }
    case "naver":         return { id: String(data.response?.id), email: data.response?.email || "", name: data.response?.name || data.response?.nickname || "", avatar: data.response?.profile_image }
    case "line":          return { id: String(data.userId), email: data.email || "", name: data.displayName || "", avatar: data.pictureUrl }
    case "paypal":        return { id: String(data.user_id || data.sub), email: data.email || "", name: data.name || "", avatar: undefined }
    case "reddit":        return { id: String(data.name), email: data.email || "", name: data.name || "", avatar: data.icon_img }
    case "salesforce":    return { id: String(data.user_id || data.sub), email: data.email || "", name: data.name || "", avatar: data.picture }
    case "tiktok":        return { id: String(data.data?.user?.open_id || data.sub), email: data.data?.user?.email || "", name: data.data?.user?.display_name || "", avatar: data.data?.user?.avatar_url }
    case "vercel":        return { id: String(data.user?.id || data.sub), email: data.user?.email || "", name: data.user?.name || data.user?.username || "", avatar: data.user?.avatar }
    case "vk":            return { id: String(data.user_id || data.sub), email: data.email || "", name: (data.name || "").toString(), avatar: undefined }
    // Generic fallback for providers with standard OpenID Connect response
    default:              return { id: String(data.sub || data.id || ""), email: data.email || "", name: data.name || data.login || data.username || "", avatar: data.picture || data.avatar_url || data.avatar }
  }
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerSocialAuth(app: any, config: AppConfig, schema: GeneratedSchema, models: CompiledModel[]) {
  const social = (config as any).auth?.social as SocialAuthConfig | undefined
  const adapter = schema.adapter
  const authModel = models.find(m => m.hasAuth)

  // Ensure sessions table exists (needed for multi-session)
  ensureSocialTable(adapter)

  // Always register multi-session endpoints
  registerSessionRoutes(app, adapter)

  if (!social || Object.keys(social).length === 0) return
  if (!authModel) return

  const baseUrl = process.env.BASE_URL || "http://localhost:3000"

  for (const [provider, providerCfg] of Object.entries(social)) {
    const urls = PROVIDER_URLS[provider]
    if (!urls) {
      console.warn("  [social-auth] Unknown provider: " + provider)
      continue
    }

    const redirectUri = providerCfg.redirectUri || `${baseUrl}/api/auth/social/${provider}/callback`

    // GET /api/auth/social/{provider}/authorize
    app.get(`/api/auth/social/${provider}/authorize`, (c: any) => {
      const state = generateState(provider)
      const authUrl = `${urls.auth}?client_id=${providerCfg.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(urls.scope)}&response_type=code&state=${state}`
      return c.redirect(authUrl, 302)
    })

    // GET /api/auth/social/{provider}/callback
    app.get(`/api/auth/social/${provider}/callback`, async (c: any) => {
      try {
        const code = c.req.query("code")
        const state = c.req.query("state")
        const error = c.req.query("error")

        if (error) return c.json({ error: "Authorization denied: " + error }, 400)
        if (!code || !state) return c.json({ error: "Missing code or state" }, 400)

        const stateData = consumeState(state)
        if (!stateData) return c.json({ error: "Invalid or expired state" }, 400)

        // Exchange code for access token
        const tokenRes = await fetch(urls.token, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            client_id: providerCfg.clientId,
            client_secret: providerCfg.clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        })
        const tokenData = await tokenRes.json()
        const accessToken = tokenData.access_token
        if (!accessToken) return c.json({ error: "Failed to get access token", details: tokenData }, 400)

        // Fetch user profile
        const profile = await fetchProfile(provider, accessToken)
        if (!profile.email) return c.json({ error: "Email not available from " + provider }, 400)

        // Find or create user
        const { id: userId } = await findOrCreateUser(adapter, authModel, provider, profile)

        // Issue tokens
        const { token, refreshToken } = await issueTokens(adapter, userId)

        // Get user data
        const col = adapter.collection(authModel.tableName, authModel)
        const user = await col.findById(userId)

        // Redirect with tokens
        const redirectTo = stateData.redirectTo
        if (redirectTo.startsWith("/")) {
          // Web flow — set cookie and redirect
          c.header("Set-Cookie", `token=${token}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`)
          return c.redirect(redirectTo, 302)
        }

        // API flow — return JSON
        return c.json({
          token,
          refreshToken,
          user: { id: userId, name: user?.name, email: user?.email },
        })
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })
  }

  // POST /api/auth/social/link — link provider to existing account
  app.post("/api/auth/social/link", async (c: any) => {
    try {
      const body = await c.req.json() as any
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)

      const { verifyJWT } = await import("../../auth")
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const { provider, providerAccountId, email, name, avatar } = body
      if (!provider || !providerAccountId) return c.json({ error: "Missing provider or providerAccountId" }, 400)

      const existing = findProviderAccount(adapter, provider, providerAccountId)
      if (existing) return c.json({ error: "Already linked to another account" }, 409)

      createProviderAccount(adapter, payload.id, provider, providerAccountId, email || "", name || "", avatar)
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // GET /api/auth/social/accounts — list linked providers
  app.get("/api/auth/social/accounts", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)

      const { verifyJWT } = await import("../../auth")
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const accounts = findAccountsByUser(adapter, payload.id)
      return c.json({ accounts: accounts.map((a: any) => ({ provider: a.provider, email: a.email, name: a.name, createdAt: a.created_at })) })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // POST /api/auth/refresh — exchange refresh token for new JWT
  app.post("/api/auth/refresh", async (c: any) => {
    try {
      const body = await c.req.json() as any
      const refreshToken = body.refreshToken
      if (!refreshToken) return c.json({ error: "Missing refreshToken" }, 400)

      const session = findSession(adapter, refreshToken)
      if (!session) return c.json({ error: "Invalid or expired refresh token" }, 401)

      // Delete old session and create new
      adapter.run("DELETE FROM _sessions WHERE id = ?", [session.id])
      const { token, refreshToken: newRefresh } = await issueTokens(adapter, session.user_id)

      return c.json({ token, refreshToken: newRefresh })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

}

// ── Multi-Session routes (registered even without social auth) ──

function registerSessionRoutes(app: any, adapter: any) {
  // GET /api/auth/sessions — list all sessions
  app.get("/api/auth/sessions", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const sessions = adapter.all(
        "SELECT id, device_name, ip, expires_at, last_active_at, created_at FROM _sessions WHERE user_id = ? ORDER BY last_active_at DESC",
        [payload.id]
      )

      return c.json({ sessions: sessions.map((s: any) => ({ ...s })) })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // DELETE /api/auth/sessions/:id — revoke a session
  app.delete("/api/auth/sessions/:id", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const sessionId = parseInt(c.req.param("id"))
      const session = adapter.get("SELECT * FROM _sessions WHERE id = ? AND user_id = ?", [sessionId, payload.id])
      if (!session) return c.json({ error: "Session not found" }, 404)

      adapter.run("DELETE FROM _sessions WHERE id = ?", [sessionId])
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // POST /api/auth/sessions/revoke-all — revoke all and create new
  app.post("/api/auth/sessions/revoke-all", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      adapter.run("DELETE FROM _sessions WHERE user_id = ?", [payload.id])

      const deviceName = (await c.req.json().catch(() => ({})))?.deviceName || ""
      const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || ""
      const { token: newToken, refreshToken } = await issueTokens(adapter, payload.id, deviceName, ip)

      return c.json({ token: newToken, refreshToken, message: "All sessions revoked" })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })
}
