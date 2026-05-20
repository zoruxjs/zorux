// ─── Plugin Route Pattern ───
// Custom route handler. Use onRoutes() to register endpoints.
// Edit the routes below.

import { Hono } from "hono"

export default {
  name: "my-plugin",
  version: "1.0.0",
  description: "Describe your plugin",

  onRoutes(app: Hono) {
    // Public route example
    app.get("/api/public", (c) => {
      return c.json({ message: "Public endpoint" })
    })

    // Authenticated route example
    app.get("/api/protected", (c) => {
      const token = c.req.header("Authorization")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      return c.json({ message: "Protected data" })
    })

    // POST route with validation example
    app.post("/api/contact", async (c) => {
      try {
        const body = await c.req.json()
        if (!body.email) return c.json({ error: "Email required" }, 400)
        return c.json({ success: true })
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })
  },
}
