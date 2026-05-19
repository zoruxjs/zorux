// CORS plugin — configurable CORS headers
// Usage: add "cors" to plugins in app.yaml
// Config (in app.yaml):
//   pluginConfig:
//     cors:
//       origins: ["https://app.example.com"]
//       methods: ["GET", "POST", "PUT", "DELETE"]
//       credentials: true

import { Hono } from "hono"
import { cors } from "hono/cors"
import type { KaiPlugin } from "../../src/core/plugin"

export default {
  name: "cors",
  version: "0.1.0",
  description: "Configurable CORS headers",

  onConfig(config: any) {
    // CORS is already in the base config Hono router via router.ts
    return config
  },

  onMiddleware(app: Hono) {
    app.use("*", cors({
      origin: (origin) => origin || "*",
      credentials: true,
    }))
    console.log("  CORS: enabled (allow all origins)")
  },
} as KaiPlugin
