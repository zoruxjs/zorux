import type { AppConfig, CompiledModel } from "../types"
import type { GeneratedSchema } from "../schema"
import { verifyJWT } from "../../auth"
import { sendEmail } from "../email"

// ═══════════════════════════════════════════════════
// Database
// ═══════════════════════════════════════════════════

function ensureTable(adapter: any) {
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _notifications (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "user_id INTEGER NOT NULL, " +
    "type TEXT NOT NULL DEFAULT 'info', " +
    "title TEXT NOT NULL, " +
    "body TEXT, " +
    "data TEXT, " +
    "link TEXT, " +
    "read_at TEXT, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
}

// ═══════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════

export function createNotification(adapter: any, userId: number, data: {
  type?: string
  title: string
  body?: string
  data?: any
  link?: string
}): any {
  adapter.run(
    "INSERT INTO _notifications (user_id, type, title, body, data, link) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, data.type || "info", data.title, data.body || null, data.data ? JSON.stringify(data.data) : null, data.link || null]
  )
  return adapter.get("SELECT * FROM _notifications WHERE id = (SELECT last_insert_rowid())")
}

export function getUserNotifications(adapter: any, userId: number, limit = 20): any[] {
  return adapter.all(
    "SELECT * FROM _notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit]
  )
}

export function getUnreadCount(adapter: any, userId: number): number {
  const row = adapter.get("SELECT COUNT(*) as cnt FROM _notifications WHERE user_id = ? AND read_at IS NULL", [userId])
  return row?.cnt || 0
}

export function markAsRead(adapter: any, id: number, userId: number): void {
  adapter.run("UPDATE _notifications SET read_at = ? WHERE id = ? AND user_id = ?", [new Date().toISOString(), id, userId])
}

export function markAllAsRead(adapter: any, userId: number): void {
  adapter.run("UPDATE _notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", [new Date().toISOString(), userId])
}

// ═══════════════════════════════════════════════════
// Push via WebSocket + Email
// ═══════════════════════════════════════════════════

export function pushNotification(adapter: any, userId: number, notification: any): void {
  // Publish to realtime so connected clients get instant updates
  try {
    const { publish } = require("../realtime")
    if (publish) {
      publish("notifications:" + userId, notification)
    }
  } catch {}
}

export async function sendNotificationEmail(email: string, title: string, body?: string): Promise<void> {
  try {
    await sendEmail({
      to: email,
      subject: title,
      text: body || title,
      html: `<p>${body || title}</p>`,
    })
  } catch {}
}

export async function createAndNotify(
  adapter: any,
  userId: number,
  data: { type?: string; title: string; body?: string; data?: any; link?: string },
  options?: { email?: string }
): Promise<any> {
  const notification = createNotification(adapter, userId, data)
  pushNotification(adapter, userId, notification)

  if (options?.email) {
    await sendNotificationEmail(options.email, data.title, data.body)
  }

  return notification
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerNotificationRoutes(app: any, _config: AppConfig, schema: GeneratedSchema, _models: CompiledModel[]) {
  const adapter = schema.adapter
  ensureTable(adapter)

  // GET /api/notifications — list user's notifications
  app.get("/api/notifications", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      const notifications = getUserNotifications(adapter, payload.id)
      const unread = getUnreadCount(adapter, payload.id)
      return c.json({ notifications, unread })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // PUT /api/notifications/:id/read — mark as read
  app.put("/api/notifications/:id/read", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      markAsRead(adapter, parseInt(c.req.param("id")), payload.id)
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // POST /api/notifications/read-all — mark all as read
  app.post("/api/notifications/read-all", async (c: any) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyJWT(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)

      markAllAsRead(adapter, payload.id)
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })
}
