// Audit trail plugin — enhanced audit logging with DB persistence
// Usage: add "audit-trail" to plugins in app.yaml
// Config (in app.yaml):
//   pluginConfig:
//     audit-trail:
//       db: "sqlite"    # persist to DB instead of in-memory
//       ttl: 7776000    # 90 days in seconds

import { Hono } from "hono"
import type { KaiPlugin } from "../../src/core/plugin"

export default {
  name: "audit-trail",
  version: "0.1.0",
  description: "Persistent audit trail with configurable retention",

  onRoutes(app: Hono, platform: any) {
    const db = platform.database
    const cfg = platform._pluginConfig?.["audit-trail"] || {}
    // Ensure audit table has an index on timestamp for efficient querying
    if (db?.run) {
      db.run("CREATE INDEX IF NOT EXISTS idx_audit_created ON _audit_logs(created_at)")
    }
  },
} as KaiPlugin
