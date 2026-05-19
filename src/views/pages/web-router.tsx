import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { Hono } from "hono"
import type { PlatformAdapter } from "../../core/platform"
import { AdminList, AdminForm } from "./admin"
import { Dashboard } from "./dashboard"
import { MonitorPage } from "./monitor"
import { FeaturePage } from "./features"
import { EmailSandboxList, EmailSandboxDetail } from "./email-sandbox"
import { AuthPage } from "./auth"
import { getStoredEmails, getStoredEmail, clearStoredEmails, deleteStoredEmail } from "../../core/email"
import { setSecureCookie } from "../../core/security"

export async function createWebRouter(platform: PlatformAdapter, app: Hono) {
  const { config, models, database, auth } = platform

  const staticDir = join(import.meta.dir, "../static")
  const rootDir = process.cwd()
  const { bundleCSS, bundleJS } = await import("../../core/assets").catch(() => ({ bundleCSS: () => "", bundleJS: () => "" }))

  app.get("/static/Zorux.css", (c) => {
    try {
      const css = bundleCSS(rootDir)
      return c.html("<style>" + css + "</style>", 200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      })
    } catch {
      const cssPath = join(staticDir, "Zorux.css")
      if (existsSync(cssPath)) {
        return c.html("<style>" + readFileSync(cssPath, "utf-8") + "</style>")
      }
      return c.text("", 404)
    }
  })

  app.get("/static/turbo.js", (c) => {
    try {
      const js = bundleJS(rootDir)
      return c.text(js, 200, {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=31536000, immutable",
      })
    } catch {
      const turboPath = join(staticDir, "turbo.js")
      if (existsSync(turboPath)) {
        return c.text(readFileSync(turboPath, "utf-8"), 200, { "Content-Type": "application/javascript" })
      }
      return c.text("", 404)
    }
  })

  // PWA: serve manifest.json and service worker from public/
  app.get("/manifest.json", async (c) => {
    const manifestPath = join(process.cwd(), "public", "manifest.json")
    if (existsSync(manifestPath)) {
      const content = readFileSync(manifestPath, "utf-8")
      return c.json(JSON.parse(content))
    }
    return c.json({
      name: config.name,
      short_name: config.name,
      start_url: "/",
      display: "standalone",
      background_color: "#0f172a",
      theme_color: "#0f172a",
      icons: [{ src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
    })
  })

  app.get("/sw.js", async (c) => {
    const swPath = join(process.cwd(), "public", "sw.js")
    if (existsSync(swPath)) {
      const content = readFileSync(swPath, "utf-8")
      return c.text(content, 200, { "Content-Type": "application/javascript" })
    }
    return c.text("", 404)
  })

  // PWA manifest link (injected by the Layout component)

  app.get("/login", (c) => c.html(<AuthPage mode="login" />))
  app.get("/register", (c) => c.html(<AuthPage mode="register" />))

  app.post("/login", async (c) => {
    try {
      const body = await c.req.parseBody()
      const authModel = models.find(m => m.hasAuth)
      if (!authModel) return c.html(<AuthPage mode="login" error="Auth not configured" />)
      const result = await auth.login({ email: body.email as string, password: body.password as string })
      setSecureCookie(c, "token", result.token)
      return c.redirect("/admin", 302)
    } catch (err: any) {
      const authModel = models.find(m => m.hasAuth)
      return c.html(authModel ? <AuthPage mode="login" error={err.message} /> : <AuthPage mode="login" error="Auth not configured" />)
    }
  })

  app.post("/register", async (c) => {
    try {
      const body = await c.req.parseBody()
      const authModel = models.find(m => m.hasAuth)
      if (!authModel) return c.html(<AuthPage mode="register" error="Auth not configured" />)
      const result = await auth.register({ name: body.name as string, email: body.email as string, password: body.password as string })
      setSecureCookie(c, "token", result.token)
      return c.redirect("/admin", 302)
    } catch (err: any) {
      const authModel = models.find(m => m.hasAuth)
      return c.html(authModel ? <AuthPage mode="register" error={err.message} /> : <AuthPage mode="register" error="Auth not configured" />)
    }
  })

  app.get("/logout", (c) => {
    setSecureCookie(c, "token", "", 0)
    return c.redirect("/login", 302)
  })

  app.get("/admin", async (c) => {
    const user = await getAuthUser(c, auth)
    if (!user) return c.redirect("/login")

    // Gather stats
    const stats: { name: string; table: string; count: number; plural: string }[] = []
    const recent: { model: string; id: any; title: string; time: string }[] = []

    for (const m of models) {
      const col = database.collection(m.tableName, m)
      let count = 0
      try { count = await col.count() } catch {}
      stats.push({ name: m.name, table: m.tableName, count, plural: m.plural })

      // Get most recent record title
      try {
        const rows = await col.find("id", "DESC", 5, 0)
        for (const row of rows) {
          const titleField = m.fields.find(f => !f.isRelation && (f.name === "title" || f.name === "name" || f.type === "string"))
          const title = titleField ? String(row[titleField.name] || "") : "#" + row.id
          recent.push({ model: m.name, id: row.id, title: title.slice(0, 60), time: row.created_at || "" })
        }
      } catch {}
    }

    recent.sort((a, b) => b.time?.localeCompare?.(a.time) || 0)
    const recentTop = recent.slice(0, 10)

    return c.html(<Dashboard user={user} models={models} stats={stats} recent={recentTop} />)
  })

  for (const model of models) {
    const basePath = "/admin/" + model.tableName
    const fields = model.fields.filter(f => !f.isRelation)
    const col = database.collection(model.tableName, model)

    app.get(basePath, async (c) => {
      const user = await getAuthUser(c, auth)
      if (!user) return c.redirect("/login")
      const query = c.req.query()
      const search = query.search || ""
      const sort = query.sort || "id"
      const order = query.order?.toUpperCase() === "DESC" ? "DESC" : "ASC"
      const page = Math.max(1, parseInt(query.page || "1"))
      const limit = 20
      const searchFields = model.fields.filter(f => !f.isRelation && (f.type === "string" || f.type === "text")).map(f => f.name)
      const offset = (page - 1) * limit
      const { rows, total } = await col.search(searchFields, search, sort, order.toLowerCase(), limit, offset)
      const totalPages = Math.ceil(total / limit)
      return c.html(<AdminList modelName={model.name} modelPlural={model.tableName} fields={fields} rows={rows as any[]} user={user} models={models} search={search} sort={sort} order={order.toLowerCase()} page={page} totalPages={totalPages} basePath={basePath} />)
    })

    app.get(basePath + "/new", async (c) => {
      const user = await getAuthUser(c, auth)
      if (!user) return c.redirect("/login")
      return c.html(<AdminForm modelName={model.name} modelPlural={model.tableName} fields={fields} isNew={true} user={user} models={models} />)
    })

    async function parseAdminForm(c: any, model: any): Promise<Record<string, any>> {
      const body = await c.req.parseBody() as Record<string, any>
      const data: Record<string, any> = {}
      const fileFields = model.fields.filter((f: any) => f.type === "file").map((f: any) => f.name)

      for (const [key, val] of Object.entries(body)) {
        if (key.startsWith("_")) continue
        if (val instanceof File && val.size > 0 && fileFields.includes(key)) {
          const ext = val.name?.split(".").pop() || "bin"
          const name = model.tableName + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext
          const buf = new Uint8Array(await val.arrayBuffer())
          data[key] = await platform.storage.upload(name, buf)
        } else if (typeof val === "string") {
          data[key] = val
        }
      }

      // Preserve existing file values if no new file uploaded
      for (const f of fileFields) {
        if (data[f] === undefined && body["_existing_" + f]) {
          data[f] = body["_existing_" + f]
        }
      }

      return data
    }

    app.post(basePath, async (c) => {
      const user = await getAuthUser(c, auth)
      if (!user) return c.redirect("/login")
      try {
        const data = await parseAdminForm(c, model)
        await col.insert(data)
        return c.redirect(basePath)
      } catch (err: any) {
        return c.html(<AdminForm modelName={model.name} modelPlural={model.tableName} fields={fields} isNew={true} error={err.message} user={user} models={models} />)
      }
    })

    app.get(basePath + "/:id/edit", async (c) => {
      const user = await getAuthUser(c, auth)
      if (!user) return c.redirect("/login")
      const id = c.req.param("id")
      const row = await col.findById(id)
      if (!row) return c.redirect(basePath)
      return c.html(<AdminForm modelName={model.name} modelPlural={model.tableName} fields={fields} values={row} isNew={false} user={user} models={models} />)
    })

    app.post(basePath + "/:id", async (c) => {
      const user = await getAuthUser(c, auth)
      if (!user) return c.redirect("/login")
      try {
        const id = c.req.param("id")
        const data = await parseAdminForm(c, model)
        await col.update(id, data)
        return c.redirect(basePath)
      } catch (err: any) {
        return c.html(<AdminForm modelName={model.name} modelPlural={model.tableName} fields={fields} values={null} isNew={false} error={err.message} user={user} models={models} />)
      }
    })

    app.post(basePath + "/:id/delete", async (c) => {
      const user = await getAuthUser(c, auth)
      if (!user) return c.redirect("/login")
      const id = c.req.param("id")
      await col.deleteById(id)
      return c.redirect(basePath)
    })
  }

  // Feature flags routes
  app.get("/admin/features", async (c) => {
    const user = await getAuthUser(c, auth)
    if (!user) return c.redirect("/login")
    try {
      const { listFlags } = await import("../../core/features")
      const db = platform.database as any
      const features = listFlags(db) || []
      return c.html(<FeaturePage user={user} models={models} features={features} />)
    } catch { return c.redirect("/admin") }
  })

  app.post("/admin/features/create", async (c) => {
    const user = await getAuthUser(c, auth)
    if (!user) return c.redirect("/login")
    try {
      const body = await c.req.parseBody()
      const { setFlag } = await import("../../core/features")
      const db = platform.database as any
      setFlag(db, body.key as string, body.name as string, true, body.description as string)
      return c.redirect("/admin/features")
    } catch { return c.redirect("/admin/features") }
  })

  app.post("/admin/features/:key/toggle", async (c) => {
    const user = await getAuthUser(c, auth)
    if (!user) return c.redirect("/login")
    try {
      const key = c.req.param("key")
      const { getFlag, invalidateCache } = await import("../../core/features")
      const db = platform.database as any
      const flag = getFlag(db, key)
      if (flag) {
        const newVal = flag.enabled === 1 ? 0 : 1
        db.run("UPDATE _feature_flags SET enabled = ?, updated_at = ? WHERE key = ?", [newVal, new Date().toISOString(), key])
        invalidateCache()
      }
      return c.redirect("/admin/features")
    } catch { return c.redirect("/admin/features") }
  })

  app.post("/admin/features/:key/delete", async (c) => {
    const user = await getAuthUser(c, auth)
    if (!user) return c.redirect("/login")
    try {
      const { deleteFlag } = await import("../../core/features")
      const db = platform.database as any
      deleteFlag(db, c.req.param("key"))
      return c.redirect("/admin/features")
    } catch { return c.redirect("/admin/features") }
  })

  // Monitor route
  app.get("/admin/monitor", async (c) => {
    const user = await getAuthUser(c, auth)
    if (!user) return c.redirect("/login")
    try {
      const { healthCheck, gatherMetrics } = await import("../../core/monitor")
      const health = healthCheck(platform)
      const metrics = gatherMetrics(platform)
      return c.html(<MonitorPage user={user} models={models} health={health} metrics={metrics} />)
    } catch {
      return c.redirect("/admin")
    }
  })

  // Email Sandbox routes
  app.get("/admin/emails", async (c) => {
    const user = await getAuthUser(c, auth)
    if (!user) return c.redirect("/login")
    const emails = getStoredEmails()
    return c.html(<EmailSandboxList emails={emails} models={models} />)
  })

  app.get("/admin/emails/:id", async (c) => {
    const user = await getAuthUser(c, auth)
    if (!user) return c.redirect("/login")
    const id = parseInt(c.req.param("id"))
    const email = getStoredEmail(id)
    if (!email) return c.redirect("/admin/emails")
    return c.html(<EmailSandboxDetail email={email} models={models} />)
  })

  app.get("/admin/emails/:id/preview", async (c) => {
    const id = parseInt(c.req.param("id"))
    const email = getStoredEmail(id)
    if (!email?.html) return c.html("<p>No HTML content</p>")
    return c.html(email.html)
  })

  app.post("/admin/emails/clear", async (c) => {
    clearStoredEmails()
    return c.redirect("/admin/emails")
  })

  app.post("/admin/emails/:id/delete", async (c) => {
    const id = parseInt(c.req.param("id"))
    deleteStoredEmail(id)
    return c.redirect("/admin/emails")
  })

  // Redirect / to /admin only if no plugin has registered a handler for /
  // Plugins registered after web-router can override this
}

async function getAuthUser(c: any, auth: any): Promise<any | null> {
  const tokenMatch = (c.req.header("Cookie") || "").match(/token=([^;]+)/)
  if (!tokenMatch) {
    try {
      const bearer = c.req.header("Authorization")
      if (bearer?.startsWith("Bearer ")) return await auth.me(JSON.parse(atob(bearer.slice(7).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).id)
    } catch {}
    return null
  }
  try {
    const payload = JSON.parse(new TextDecoder().decode(
      new Uint8Array(Array.from(atob(tokenMatch[1].split(".")[1].replace(/-/g, "+").replace(/_/g, "/")), function(c) { return c.charCodeAt(0) }))
    ))
    return await auth.me(payload.id) || null
  } catch { return null }
}
