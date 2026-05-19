import type { AppConfig, CompiledModel } from "../types"
import type { PlatformAdapter, AuthInput, AuthResult, AuthProvider, RealtimeProvider, StorageProvider } from "./types"
import type { DataCollection } from "../db"
import { createDrizzleSchema } from "../schema"

const JWT_SECRET = process.env.JWT_SECRET || "Zorux-dev-secret-change-in-production"

function base64url(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

async function createJWT(payload: Record<string, any>): Promise<string> {
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })))
  const body = base64url(new TextEncoder().encode(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 86400000 })))
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = base64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(header + "." + body)))
  return header + "." + body + "." + sig
}

async function verifyJWT(token: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"])
    const sigData = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify("HMAC", key, sigData, new TextEncoder().encode(parts[0] + "." + parts[1]))
    if (!valid) return null
    const payload = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))
    ))
    if (payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

function generateRefreshToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
}

function createSessionRow(adapter: any, userId: number): string {
  const refreshToken = generateRefreshToken()
  const expiresAt = new Date(Date.now() + 30 * 86400_000).toISOString()
  try {
    adapter.run?.(
      "CREATE TABLE IF NOT EXISTS _sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, refresh_token TEXT NOT NULL UNIQUE, device_name TEXT DEFAULT '', ip TEXT DEFAULT '', expires_at TEXT NOT NULL, last_active_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    )
    adapter.run?.(
      "INSERT INTO _sessions (user_id, refresh_token, expires_at, last_active_at) VALUES (?, ?, ?, ?)",
      [userId, refreshToken, expiresAt, new Date().toISOString()]
    )
  } catch {}
  return refreshToken
}

function makeAuthProvider(models: CompiledModel[], adapter: { collection: Function; run?: Function }, defaultRole = "viewer"): AuthProvider {
  const authModel = models.find(m => m.hasAuth)
  const hasRoleField = authModel?.fields.some(f => f.name === "role")

  const getCol = () => authModel ? adapter.collection(authModel.tableName, authModel) : null

  // Password verify cache: avoids bcrypt for repeated logins
  const pwCache = new Map<string, { hash: string; result: boolean; expires: number }>()
  const PW_CACHE_TTL = 60_000

  return {
    async register(input: AuthInput): Promise<AuthResult> {
      const col = getCol()
      if (!col) throw new Error("Auth not configured")
      const hash = await Bun.password.hash(input.password)
      const data: Record<string, any> = { name: input.name, email: input.email, password: hash }
      const role = input.role || defaultRole
      if (hasRoleField) data.role = role
      const created = await col.insert(data)
      const token = await createJWT({ id: created.id, email: created.email, role })
      createSessionRow(adapter, created.id)
      return { token, user: { id: created.id, name: created.name, email: created.email, role } }
    },

    async login(input: AuthInput): Promise<AuthResult> {
      const col = getCol()
      if (!col) throw new Error("Auth not configured")
      const user = await col.findBy("email", input.email)
      if (!user) throw new Error("Invalid credentials")
      // Check password cache first
      const cacheKey = input.email + ":" + input.password
      const cached = pwCache.get(cacheKey)
      let valid: boolean
      if (cached && cached.expires > Date.now()) {
        valid = cached.result
      } else {
        valid = await Bun.password.verify(input.password, user.password)
        pwCache.set(cacheKey, { hash: user.password, result: valid, expires: Date.now() + PW_CACHE_TTL })
        if (pwCache.size > 1000) {
          const now = Date.now()
          for (const [k, v] of pwCache) if (v.expires < now) pwCache.delete(k)
        }
      }
      if (!valid) throw new Error("Invalid credentials")
      const role = (hasRoleField && user.role) || defaultRole
      const token = await createJWT({ id: user.id, email: user.email, role })
      createSessionRow(adapter, user.id)
      return { token, user: { id: user.id, name: user.name, email: user.email, role } }
    },

    async me(userId: any) {
      const col = getCol()
      if (!col) return null
      const u = await col.findById(userId)
      return u ? { id: u.id, name: u.name, email: u.email, role: u.role || defaultRole } : null
    },

    middleware() {
      return async (c: any, next: any) => {
        const auth = c.req.header("Authorization")
        let token: string | null = null
        if (auth?.startsWith("Bearer ")) token = auth.slice(7)
        else {
          const cookie = c.req.header("Cookie") || ""
          const match = cookie.match(/token=([^;]+)/)
          token = match ? match[1] : null
        }
        if (!token) return c.json({ error: "Unauthorized" }, 401)
        const payload = await verifyJWT(token)
        if (!payload) return c.json({ error: "Invalid token" }, 401)
        c.set("user", payload)
        await next()
      }
    },
  }
}

function makeRealtimeProvider(): RealtimeProvider {
  let subs: Map<string, Set<(data: any) => void>> = new Map()

  return {
    publish(topic: string, data: any) {
      const set = subs.get(topic)
      if (set) for (const fn of set) fn(data)
    },
    subscribe(topic: string, callback: (data: any) => void) {
      if (!subs.has(topic)) subs.set(topic, new Set())
      subs.get(topic)!.add(callback)
      return () => subs.get(topic)?.delete(callback)
    },
    websocket() {
      return {
        open(ws: any) {
          ws._subs = new Set<string>()
          ws._sub = (topic: string) => {
            ws._subs.add(topic)
            const unsub = this.subscribe(topic, (data: any) => {
              try { ws.send(JSON.stringify({ topic, data })) } catch {}
            })
            ws._cleanup = unsub
          }
        },
        message(ws: any, msg: string) {
          try {
            const m = JSON.parse(msg)
            if (m.subscribe && ws._sub) ws._sub(m.subscribe)
            if (m.unsubscribe) ws._subs?.delete(m.unsubscribe)
          } catch {}
        },
        close(ws: any) {
          if (ws._cleanup) ws._cleanup()
          ws._subs?.clear()
        },
      }
    },
  }
}

function makeLocalStorage(): StorageProvider {
  return {
    async upload(name: string, data: Uint8Array | Blob): Promise<string> {
      const { writeFileSync, mkdirSync, existsSync } = require("fs")
      const { join, dirname } = require("path")
      const filePath = join(process.cwd(), "public", "uploads", name)
      const parentDir = dirname(filePath)
      if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true })
      const buf = data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : Buffer.from(data)
      writeFileSync(filePath, buf)
      return "/uploads/" + name
    },
    url(path: string) { return path },
  }
}

function makeStorageProvider(config: AppConfig): StorageProvider {
  if (config.storage?.provider === "s3") {
    const { createS3Storage } = require("./storage-s3")
    const s3cfg = config.storage.s3
    return createS3Storage({
      endpoint: s3cfg?.endpoint || process.env.S3_ENDPOINT,
      region: s3cfg?.region || process.env.S3_REGION || "us-east-1",
      bucket: s3cfg?.bucket || process.env.S3_BUCKET || "",
      accessKey: s3cfg?.accessKey || process.env.S3_ACCESS_KEY,
      secretKey: s3cfg?.secretKey || process.env.S3_SECRET_KEY,
      publicUrl: s3cfg?.publicUrl,
    })
  }
  return makeLocalStorage()
}

export async function createZoruxPlatform(config: AppConfig, models: CompiledModel[]): Promise<PlatformAdapter> {
  const { adapter, provider } = await createDrizzleSchema(config, models)

  const db = {
    collection(tableName: string, model?: CompiledModel): DataCollection {
      return adapter.collection(tableName, model)
    },
    close() { adapter.close() },
    run(sql: string, params?: any[]) { adapter.run(sql, params) },
    get(sql: string, params?: any[]) { return adapter.get ? adapter.get(sql, params) : null },
    all(sql: string, params?: any[]) { return adapter.all ? adapter.all(sql, params) : [] },
  }

  return {
    name: provider === "mongodb" ? "Zorux-mongo" : "Zorux",
    config,
    models,
    database: db,
    auth: makeAuthProvider(models, db, config.auth?.defaultRole || "viewer"),
    realtime: makeRealtimeProvider(),
    storage: makeStorageProvider(config),
  }
}

// Re-export verifyJWT and authMiddleware for backward compatibility
export { verifyJWT }
