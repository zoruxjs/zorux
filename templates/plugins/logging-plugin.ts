// Logging plugin example — logs all HTTP requests with timing
// Usage: add "logging" to plugins in app.yaml
// Config (in app.yaml):
//   pluginConfig:
//     logging:
//       format: "json"    # or "text"
//       logBody: false

import { Hono } from "hono"
import type { KaiPlugin } from "../../src/core/plugin"

export default {
  name: "logging",
  version: "0.1.0",
  description: "HTTP request logging with timing and optional body capture",

  onMiddleware(app: Hono) {
    app.use("*", async (c: any, next: any) => {
      const start = Date.now()
      const method = c.req.method
      const url = c.req.url
      await next()
      const duration = Date.now() - start
      const status = c.res.status
      const level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO"
      const pluginConfig = (c.get("platform") as any)?._pluginConfig?.logging || {}
      if (pluginConfig.format === "json") {
        console.log(JSON.stringify({ level, method, url, status, duration, ts: new Date().toISOString() }))
      } else {
        console.log(`[${level}] ${method} ${url} → ${status} (${duration}ms)`)
      }
    })
  },
} as KaiPlugin
