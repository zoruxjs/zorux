import { createHash, randomBytes } from "crypto"
import type { AppConfig, CompiledModel } from "../types"

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

interface WebhookRow {
  id: number
  url: string
  events: string
  secret: string
  active: number
  user_id: number
  created_at: string
}

interface WebhookPayload {
  event: string
  model: string
  data: any
  timestamp: string
}

// ═══════════════════════════════════════════════════
// Storage
// ═══════════════════════════════════════════════════

function ensureTable(adapter: any) {
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _webhooks (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "url TEXT NOT NULL, " +
    "events TEXT NOT NULL DEFAULT '*', " +
    "secret TEXT NOT NULL, " +
    "active INTEGER DEFAULT 1, " +
    "user_id INTEGER NOT NULL, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
}

function listWebhooks(adapter: any, userId?: number): WebhookRow[] {
  if (userId) {
    return adapter.all("SELECT * FROM _webhooks WHERE user_id = ? ORDER BY created_at DESC", [userId])
  }
  return adapter.all("SELECT * FROM _webhooks WHERE active = 1")
}

function getWebhook(adapter: any, id: number, userId: number): WebhookRow | null {
  return adapter.get("SELECT * FROM _webhooks WHERE id = ? AND user_id = ?", [id, userId])
}

function createWebhook(adapter: any, url: string, events: string, userId: number): WebhookRow {
  const secret = randomBytes(16).toString("hex")
  adapter.run("INSERT INTO _webhooks (url, events, secret, user_id) VALUES (?, ?, ?, ?)", [url, events, secret, userId])
  return adapter.get("SELECT * FROM _webhooks WHERE id = (SELECT last_insert_rowid())")
}

function updateWebhook(adapter: any, id: number, userId: number, updates: { url?: string; events?: string; active?: number }): void {
  const sets: string[] = []
  const params: any[] = []
  if (updates.url !== undefined) { sets.push("url = ?"); params.push(updates.url) }
  if (updates.events !== undefined) { sets.push("events = ?"); params.push(updates.events) }
  if (updates.active !== undefined) { sets.push("active = ?"); params.push(updates.active) }
  if (sets.length === 0) return
  params.push(id, userId)
  adapter.run(`UPDATE _webhooks SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, params)
}

function deleteWebhook(adapter: any, id: number, userId: number): void {
  adapter.run("DELETE FROM _webhooks WHERE id = ? AND user_id = ?", [id, userId])
}

// ═══════════════════════════════════════════════════
// Delivery
// ═══════════════════════════════════════════════════

function signPayload(payload: string, secret: string): string {
  return createHash("sha256").update(payload + secret).digest("hex")
}

async function deliverWebhook(webhook: WebhookRow, payload: WebhookPayload): Promise<{ ok: boolean; status: number }> {
  const body = JSON.stringify(payload)
  const signature = signPayload(body, webhook.secret)

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": payload.event,
        "User-Agent": "Zorux-Webhook/1.0",
      },
      body,
      signal: AbortSignal.timeout(10000),
    })
    return { ok: res.ok, status: res.status }
  } catch {
    return { ok: false, status: 0 }
  }
}

// ═══════════════════════════════════════════════════
// Fire events
// ═══════════════════════════════════════════════════

export async function fireWebhookEvent(adapter: any, event: string, model: string, data: any): Promise<void> {
  const hooks = listWebhooks(adapter)
  const matching = hooks.filter(h => {
    if (!h.active) return false
    if (h.events === "*") return true
    return h.events.split(",").map(e => e.trim()).includes(event)
  })

  const payload: WebhookPayload = {
    event,
    model,
    data,
    timestamp: new Date().toISOString(),
  }

  // Fire and forget — deliver all matching webhooks concurrently
  await Promise.allSettled(
    matching.map(hook => deliverWebhook(hook, payload))
  )
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerWebhookRoutes(app: any, _config: AppConfig, schema: GeneratedSchema, _models: CompiledModel[]) {
  const adapter = schema.adapter
  ensureTable(adapter)

  // POST /api/webhooks — create a webhook
  app.post("/api/webhooks", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const { verifyJWT } = await import("../../auth")
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      let { url, events } = await c.req.json()
      if (!url) return c.json({ error: "URL is required" }, 400)
      if (Array.isArray(events)) events = events.join(",")
      if (!events) events = "*"

      const hook = createWebhook(adapter, url, events, payload.id)
      return c.json({ id: hook.id, url: hook.url, events: hook.events, secret: hook.secret }, 201)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // GET /api/webhooks — list webhooks
  app.get("/api/webhooks", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const { verifyJWT } = await import("../../auth")
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const hooks = listWebhooks(adapter, payload.id)
      return c.json({ webhooks: hooks.map(h => ({ id: h.id, url: h.url, events: h.events, active: h.active, created_at: h.created_at })) })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // PUT /api/webhooks/:id — update a webhook
  app.put("/api/webhooks/:id", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const { verifyJWT } = await import("../../auth")
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const id = parseInt(c.req.param("id"))
      const body = await c.req.json()
      updateWebhook(adapter, id, payload.id, body)
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // DELETE /api/webhooks/:id — delete a webhook
  app.delete("/api/webhooks/:id", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const { verifyJWT } = await import("../../auth")
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const id = parseInt(c.req.param("id"))
      deleteWebhook(adapter, id, payload.id)
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })
}

import type { GeneratedSchema } from "../schema"
