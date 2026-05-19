import type { AppConfig, CompiledModel } from "../types"
import type { GeneratedSchema } from "../schema"

// ═══════════════════════════════════════════════════
// Database
// ═══════════════════════════════════════════════════

function ensureTable(adapter: any) {
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _feature_flags (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "key TEXT NOT NULL UNIQUE, " +
    "name TEXT NOT NULL, " +
    "description TEXT, " +
    "enabled INTEGER DEFAULT 0, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP, " +
    "updated_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
}

// ═══════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════

export function listFlags(adapter: any): any[] {
  return adapter.all("SELECT * FROM _feature_flags ORDER BY key ASC")
}

export function getFlag(adapter: any, key: string): any {
  return adapter.get("SELECT * FROM _feature_flags WHERE key = ?", [key])
}

export function setFlag(adapter: any, key: string, name: string, enabled: boolean, description?: string): any {
  const existing = getFlag(adapter, key)
  if (existing) {
    adapter.run("UPDATE _feature_flags SET enabled = ?, description = COALESCE(?, description), updated_at = ? WHERE key = ?",
      [enabled ? 1 : 0, description || null, new Date().toISOString(), key])
  } else {
    adapter.run("INSERT INTO _feature_flags (key, name, description, enabled) VALUES (?, ?, ?, ?)",
      [key, name, description || null, enabled ? 1 : 0])
  }
  return getFlag(adapter, key)
}

export function deleteFlag(adapter: any, key: string): void {
  adapter.run("DELETE FROM _feature_flags WHERE key = ?", [key])
}

export function isEnabled(adapter: any, key: string, defaultVal = false): boolean {
  const flag = getFlag(adapter, key)
  if (!flag) return defaultVal
  return flag.enabled === 1
}

// ═══════════════════════════════════════════════════
// In-memory cache for flags (avoid DB query per check)
// ═══════════════════════════════════════════════════

const flagCache = new Map<string, boolean>()
let cacheExpiry = 0

function refreshCache(adapter: any): void {
  try {
    flagCache.clear()
    const flags = listFlags(adapter)
    for (const flag of flags) flagCache.set(flag.key, flag.enabled === 1)
    cacheExpiry = Date.now() + 5000 // 5 seconds
  } catch {}
}

export function isFeatureEnabled(adapter: any, key: string, defaultVal = false): boolean {
  if (Date.now() > cacheExpiry) refreshCache(adapter)
  if (flagCache.has(key)) return flagCache.get(key)!
  return defaultVal
}

export function invalidateCache(): void {
  flagCache.clear()
  cacheExpiry = 0
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerFeatureRoutes(app: any, _config: AppConfig, schema: GeneratedSchema, _models: CompiledModel[]) {
  const adapter = schema.adapter
  ensureTable(adapter)

  // GET /api/features — list all flags
  app.get("/api/features", async (c: any) => {
    try {
      const flags = listFlags(adapter)
      return c.json({ features: flags })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // POST /api/features — create or update a flag
  app.post("/api/features", async (c: any) => {
    try {
      const { key, name, enabled, description } = await c.req.json()
      if (!key || !name) return c.json({ error: "key and name are required" }, 400)
      const flag = setFlag(adapter, key, name, enabled, description)
      invalidateCache()
      return c.json(flag, 201)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // PUT /api/features/:key/toggle — toggle a flag
  app.put("/api/features/:key/toggle", async (c: any) => {
    try {
      const key = c.req.param("key")
      const flag = getFlag(adapter, key)
      if (!flag) return c.json({ error: "Feature not found" }, 404)
      const newVal = flag.enabled === 1 ? 0 : 1
      adapter.run("UPDATE _feature_flags SET enabled = ?, updated_at = ? WHERE key = ?", [newVal, new Date().toISOString(), key])
      invalidateCache()
      return c.json({ key, enabled: newVal === 1 })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // DELETE /api/features/:key — delete a flag
  app.delete("/api/features/:key", async (c: any) => {
    try {
      const key = c.req.param("key")
      deleteFlag(adapter, key)
      invalidateCache()
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })
}
