import type { AppConfig, CompiledModel } from "../types"
import type { GeneratedSchema } from "../schema"
import { verifyJWT } from "../../auth"

// ═══════════════════════════════════════════════════
// Database
// ═══════════════════════════════════════════════════

function ensureTable(adapter: any) {
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _audit_logs (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "user_id INTEGER, " +
    "user_name TEXT, " +
    "model TEXT NOT NULL, " +
    "record_id INTEGER, " +
    "action TEXT NOT NULL, " +
    "old_values TEXT, " +
    "new_values TEXT, " +
    "ip TEXT, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
}

// ═══════════════════════════════════════════════════
// Logging
// ═══════════════════════════════════════════════════

export function logAudit(
  adapter: any,
  userId: number | null,
  userName: string | null,
  model: string,
  recordId: any,
  action: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  ip?: string,
): void {
  try { adapter.run("CREATE TABLE IF NOT EXISTS _audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_name TEXT, model TEXT NOT NULL, record_id INTEGER, action TEXT NOT NULL, old_values TEXT, new_values TEXT, ip TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)") } catch {}
  adapter.run(
    "INSERT INTO _audit_logs (user_id, user_name, model, record_id, action, old_values, new_values, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      userId,
      userName || "system",
      model,
      recordId,
      action,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ip || null,
    ]
  )
}

// ═══════════════════════════════════════════════════
// Query
// ═══════════════════════════════════════════════════

export function queryAuditLogs(
  adapter: any,
  options?: { model?: string; action?: string; userId?: number; limit?: number; offset?: number },
): { logs: any[]; total: number } {
  let where = "WHERE 1=1"
  const params: any[] = []

  if (options?.model) { where += " AND model = ?"; params.push(options.model) }
  if (options?.action) { where += " AND action = ?"; params.push(options.action) }
  if (options?.userId) { where += " AND user_id = ?"; params.push(options.userId) }

  const limit = options?.limit || 50
  const offset = options?.offset || 0

  const totalRow = adapter.get("SELECT COUNT(*) as cnt FROM _audit_logs " + where, params)
  const total = totalRow?.cnt || 0

  const logs = adapter.all(
    "SELECT * FROM _audit_logs " + where + " ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [...params, limit, offset]
  )

  // Parse JSON fields
  for (const log of logs) {
    if (log.old_values) try { log.old_values = JSON.parse(log.old_values) } catch {}
    if (log.new_values) try { log.new_values = JSON.parse(log.new_values) } catch {}
  }

  return { logs, total }
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerAuditRoutes(app: any, _config: AppConfig, schema: GeneratedSchema, _models: CompiledModel[]) {
  const adapter = schema.adapter
  try { adapter.run("CREATE TABLE IF NOT EXISTS _audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_name TEXT, model TEXT NOT NULL, record_id INTEGER, action TEXT NOT NULL, old_values TEXT, new_values TEXT, ip TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)") } catch {}

  // GET /api/audit-logs — query audit logs
  app.get("/api/audit-logs", async (c: any) => {
    try {
      const model = c.req.query("model") || undefined
      const action = c.req.query("action") || undefined
      const limit = parseInt(c.req.query("limit") || "50")
      const offset = parseInt(c.req.query("offset") || "0")

      const result = queryAuditLogs(adapter, { model, action, limit, offset })
      return c.json(result)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })
}
