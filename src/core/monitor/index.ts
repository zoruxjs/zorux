import type { PlatformAdapter } from "../platform"

// ═══════════════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════════════

export function healthCheck(platform: PlatformAdapter): Record<string, any> {
  const checks: Record<string, any> = {}
  let allHealthy = true

  // Database check
  try {
    const db = platform.database as any
    if (db?.all) {
      const row = db.all("SELECT 1 as ok")
      checks.database = { status: "ok", provider: platform.config.database?.provider || "sqlite" }
    } else if (db?.collection) {
      checks.database = { status: "ok", provider: platform.config.database?.provider || "unknown" }
    }
  } catch (err: any) {
    checks.database = { status: "error", message: err.message }
    allHealthy = false
  }

  // Overall status
  return {
    status: allHealthy ? "healthy" : "degraded",
    name: platform.config.name,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  }
}

// ═══════════════════════════════════════════════════
// Gather metrics from various modules
// ═══════════════════════════════════════════════════

export function gatherMetrics(platform: PlatformAdapter): Record<string, any> {
  const db = platform.database as any
  const metrics: Record<string, any> = {}

  // Model counts
  if (db?.all) {
    metrics.models = {}
    for (const model of platform.models) {
      try {
        const row = db.get("SELECT COUNT(*) as cnt FROM " + model.tableName)
        metrics.models[model.name] = row?.cnt || 0
      } catch {}
    }
  }

  // Job counts (if _Zorux_jobs table exists)
  if (db?.all) {
    try {
      const jobs: Record<string, number> = {}
      const statuses = db.all("SELECT status, COUNT(*) as cnt FROM _Zorux_jobs GROUP BY status")
      if (statuses) {
        for (const row of statuses) jobs[row.status] = row.cnt
        metrics.jobs = jobs
      }
    } catch {}
  }

  // Organization counts
  if (db?.all) {
    try {
      const row = db.get("SELECT COUNT(*) as cnt FROM _organizations")
      if (row) metrics.organizations = row.cnt
    } catch {}

    try {
      const row = db.get("SELECT COUNT(*) as cnt FROM _org_members WHERE status = 'active'")
      if (row) metrics.members = row.cnt
    } catch {}
  }

  // Notification counts
  if (db?.all) {
    try {
      const row = db.get("SELECT COUNT(*) as cnt FROM _notifications")
      if (row) metrics.notifications = row.cnt
    } catch {}
  }

  // Session counts
  if (db?.all) {
    try {
      const row = db.get("SELECT COUNT(*) as cnt FROM _sessions")
      if (row) metrics.sessions = row.cnt
    } catch {}
  }

  return metrics
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerMonitorRoutes(app: any, platform: PlatformAdapter) {
  // GET /api/health — health check
  app.get("/api/health", (c: any) => {
    return c.json(healthCheck(platform))
  })

  // GET /api/admin/metrics — application metrics
  app.get("/api/admin/metrics", (c: any) => {
    return c.json(gatherMetrics(platform))
  })
}
