import type { AppConfig, CompiledModel } from "../core/types"
import type { GeneratedSchema } from "../core/schema"

const JWT_SECRET = process.env.JWT_SECRET || "Zorux-dev-secret-change-in-production"

function base64url(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

export async function createJWT(payload: Record<string, any>): Promise<string> {
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })))
  const body = base64url(new TextEncoder().encode(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 86400000 })))
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = base64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(header + "." + body)))
  return header + "." + body + "." + sig
}

export async function verifyJWT(token: string): Promise<Record<string, any> | null> {
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
  } catch {
    return null
  }
}

export async function authMiddleware(c: any, next: any) {
  const auth = c.req.header("Authorization")
  let token: string | null = null
  if (auth?.startsWith("Bearer ")) {
    token = auth.slice(7)
  } else {
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

export interface AuthSystem {
  registerRoutes: (app: any) => void
}

export function createAuthSystem(config: AppConfig, models: CompiledModel[], schema: GeneratedSchema): AuthSystem {
  const authModel = models.find(m => m.hasAuth)
  if (!authModel) return { registerRoutes: () => {} }

  const col = schema.adapter.collection(authModel.tableName, authModel)

  return {
    registerRoutes: (app) => {
      app.post("/api/auth/register", async (c: any) => {
        try {
          const body = await c.req.json() as Record<string, any>
          const password = body.password
          if (!password) return c.json({ error: "Password required" }, 400)
          const hash = await Bun.password.hash(password)
          const fields = { ...body, password: hash }
          delete fields.confirmPassword
          const created = await col.insert(fields)
          const token = await createJWT({ id: created.id, email: created.email })
          return c.json({ token, user: { id: created.id, name: created.name, email: created.email } }, 201)
        } catch (err: any) {
          return c.json({ error: err.message }, 500)
        }
      })

      app.post("/api/auth/login", async (c: any) => {
        try {
          const body = await c.req.json() as Record<string, any>
          const user = await col.findBy("email", body.email)
          if (!user) return c.json({ error: "Invalid credentials" }, 401)
          const valid = await Bun.password.verify(body.password, user.password)
          if (!valid) return c.json({ error: "Invalid credentials" }, 401)
          const token = await createJWT({ id: user.id, email: user.email })
          return c.json({ token, user: { id: user.id, name: user.name, email: user.email } })
        } catch (err: any) {
          return c.json({ error: err.message }, 500)
        }
      })

      app.get("/api/auth/me", authMiddleware, async (c: any) => {
        const user = c.get("user")
        const u = await col.findById(user.id)
        return c.json({ user: u ? { id: u.id, name: u.name, email: u.email } : null })
      })
    },
  }
}
