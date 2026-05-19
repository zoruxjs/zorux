// Rate limiter plugin — configurable per-route rate limiting
// Usage: add "rate-limiter" to plugins in app.yaml
// Config (in app.yaml):
//   pluginConfig:
//     rate-limiter:
//       maxRequests: 100
//       windowMs: 60000

import { Hono } from "hono"
import type { KaiPlugin } from "../../src/core/plugin"

interface RateLimitEntry {
  count: number
  resetAt: number
}

export default {
  name: "rate-limiter",
  version: "0.1.0",
  description: "Per-IP rate limiting with configurable window",

  onMiddleware(app: Hono) {
    const store = new Map<string, RateLimitEntry>()

    app.use("*", async (c: any, next: any) => {
      const cfg = c.get("platform")?._pluginConfig?.["rate-limiter"] || {}
      const maxReqs = cfg.maxRequests || 100
      const windowMs = cfg.windowMs || 60000
      const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"
      const now = Date.now()
      const entry = store.get(ip)
      if (!entry || now > entry.resetAt) {
        store.set(ip, { count: 1, resetAt: now + windowMs })
      } else if (entry.count >= maxReqs) {
        return c.json({ error: "Rate limit exceeded" }, 429)
      } else {
        entry.count++
      }
      await next()
    })
  },
} as KaiPlugin
