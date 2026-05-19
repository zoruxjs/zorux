import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import type { PlatformAdapter } from "./platform"
import { validateFields } from "./validate"
import { generateOpenApiSpec, swaggerUiHtml } from "./openapi"
import { checkPolicy as abacCheck, filterFields, addDerivedRole } from "./policy-engine"
import { fireWebhookEvent } from "./webhooks"
import { indexModelRecord, removeModelIndex, getSearchProvider } from "./search"
import { logAudit } from "./audit"
import { emit } from "./events"

async function checkPolicy(c: any, policy: string | undefined, auth: any, authModel: any, model?: any, resource?: any): Promise<true | Response> {
  const p = policy || (authModel ? "authenticated" : "*")

  // Fast path: simple role strings
  if (p === "*") return true

  if (/^[a-zA-Z_,\s]+$/.test(p) && !p.includes(".") && !p.includes(" ")) {
    if (p === "authenticated") {
      const token = getToken(c)
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      const payload = await verifyPayload(token)
      if (!payload) return c.json({ error: "Invalid token" }, 401)
      c.set("user", payload)
      return true
    }

    const token = getToken(c)
    if (!token) return c.json({ error: "Unauthorized" }, 401)
    const payload = await verifyPayload(token)
    if (!payload) return c.json({ error: "Invalid token" }, 401)
    c.set("user", payload)

    const roles = p.split(",").map((r: string) => r.trim())
    if (roles.includes("owner")) return true
    if (roles.includes(payload.role)) return true
    if (roles.includes("*")) return true

    return c.json({ error: "Forbidden: insufficient permissions" }, 403)
  }

  // ABAC path: evaluate condition expression
  const token = getToken(c)
  if (!token) return c.json({ error: "Unauthorized" }, 401)
  const payload = await verifyPayload(token)
  if (!payload) return c.json({ error: "Invalid token" }, 401)
  c.set("user", payload)

  const result = abacCheck({
    policy: p,
    model: model?.name || "",
    operation: c.req.method,
    user: payload,
    resource: resource || {},
  })

  if (result.allowed) return true
  return c.json({ error: "Forbidden: " + result.reason }, 403)
}

async function checkOwner(c: any, policy: string | undefined, record: any, model: any): Promise<true | Response> {
  const p = policy || "authenticated"
  if (!p.split(",").map((r: string) => r.trim()).includes("owner")) return true
  const user = c.get("user")
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  const ownerField = model.ownerField
  if (!ownerField) return true
  if (user.role === "admin") return true
  if (record && record[ownerField] === user.id) return true
  return c.json({ error: "Forbidden: not the owner" }, 403)
}

function getToken(c: any): string | null {
  const auth = c.req.header("Authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  const cookie = c.req.header("Cookie") || ""
  const match = cookie.match(/token=([^;]+)/)
  return match ? match[1] : null
}

async function verifyPayload(token: string): Promise<any> {
  try {
    const { verifyJWT } = await import("./platform/Zorux")
    return await verifyJWT(token)
  } catch { return null }
}

async function checkOwner(c: any, policy: string | undefined, record: any, model: any): Promise<true | Response> {
  const p = policy || "authenticated"
  if (!p.split(",").map((r: string) => r.trim()).includes("owner")) return true
  const user = c.get("user")
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  const ownerField = model.ownerField
  if (!ownerField) return true
  if (user.role === "admin") return true
  if (record && record[ownerField] === user.id) return true
  return c.json({ error: "Forbidden: not the owner" }, 403)
}

interface ActionHandler {
  policy: string
  role?: string
  ownerField?: string
  handler: (c: any) => any | Promise<any>
}

export function createRouter(platform: PlatformAdapter, actions?: Record<string, Record<string, ActionHandler>>): Hono {
  const app = new Hono()
  const { config, models, database, auth, realtime } = platform
  const authModel = models.find(m => m.hasAuth)

  app.use("*", cors())
  app.use("*", logger())

  app.get("/api/openapi.json", (c) => c.json(generateOpenApiSpec(platform)))
  app.get("/api/docs", (c) => c.html(swaggerUiHtml("/api/openapi.json")))

  // Global error handler
  app.onError((err: any, c: any) => {
    const { formatErrorWithHints } = require("./hints")
    console.error(formatErrorWithHints(err.message, err.status || 500))
    try {
      const { renderErrorPage } = require("../views/pages/error-page")
      return renderErrorPage(err, err.status || 500, c.req.raw)
    } catch {
      return c.json({ error: err.message }, err.status || 500)
    }
  })

  app.get("/api", (c) => c.json({
    name: config.name,
    version: "0.1.0",
    models: models.map(m => ({ name: m.name, path: "/api/" + m.tableName })),
  }))

  app.post("/api/auth/register", async (c: any) => {
    try {
      const body = await c.req.json() as any
      if (!body.email || !body.password || !body.name) {
        return c.json({ error: "name, email, and password are required" }, 400)
      }
      const result = await auth.register(body)
      return c.json(result, 201)
    } catch (err: any) {
      const msg = (err.message || "").toLowerCase()
      if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("already exists")) {
        return c.json({ error: "Email already registered" }, 409)
      }
      return c.json({ error: err.message }, 500)
    }
  })

  app.post("/api/auth/login", async (c: any) => {
    try {
      const body = await c.req.json() as any
      const result = await auth.login(body)
      return c.json(result)
    } catch (err: any) {
      return c.json({ error: err.message }, err.message === "Invalid credentials" ? 401 : 500)
    }
  })

  app.get("/api/auth/me", async (c: any) => {
    const cp = await checkPolicy(c, "authenticated", auth, authModel)
    if (cp !== true) return cp
    const user = c.get("user")
    const u = await auth.me(user.id)
    return c.json({ user: u })
  })

  for (const model of models) {
    if (model.derivedRoles) {
      for (const dr of model.derivedRoles) addDerivedRole(dr)
    }

    const basePath = "/api/" + model.tableName
    const col = database.collection(model.tableName, model)
    const policies = model.policies || {}
    const fieldPolicies = model.fieldPolicies || []
    const defaultPol = model.hasAuth ? "authenticated" : "*"

    // Helper to filter fields based on user
    const filterByPermission = (data: any | any[], user: any) => {
      if (!fieldPolicies.length) return data
      const ctx = { user: user || {}, resource: {}, env: {} }
      return filterFields(fieldPolicies, data, "read", ctx as any)
    }

    app.get(basePath, async (c) => {
      try {
        const pl = await checkPolicy(c, policies.list || defaultPol, auth, authModel, model)
        if (pl !== true) return pl
        const query = c.req.query()
        const search = query.search || ""
        const sort = query.sort || "id"
        const order = query.order?.toUpperCase() === "DESC" ? "DESC" : "ASC"
        const page = Math.max(1, parseInt(query.page || "1"))
        const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20")))
        const searchFields = model.fields.filter(f => !f.isRelation && (f.type === "string" || f.type === "text")).map(f => f.name)
        const offset = (page - 1) * limit

        // Scoped model: add orgId filter
        let orgWhere = ""
        let orgParams: any[] = []
        if (model.isScoped) {
          const org = getOrg(c)
          if (!org) return c.json({ error: "X-Org-ID header required" }, 400)
          // For search, we need to inject orgId filter manually
          // We'll use collection.find and filter in-memory for scoped models
          const allRows = await col.find(sort, order, 0, 0)
          const scopedRows = allRows.filter((r: any) => r.orgId === org.id)
          const total = scopedRows.length
          const paged = scopedRows.slice(offset, offset + limit)
          const totalPages = Math.ceil(total / limit)

          const includes = query.include ? query.include.split(",").map((s: string) => s.trim()).filter(Boolean) : []
          const user = c.get("user")
          const permissionFiltered = filterByPermission(paged, user)
          await attachIncludes(permissionFiltered, model, includes, models, database)
          return c.json({ data: permissionFiltered, pagination: { page, limit, total, totalPages } })
        }

        let { rows, total } = await col.search(searchFields, search, sort, order.toLowerCase(), limit, offset)
        const totalPages = Math.ceil(total / limit)

        // Filter out soft-deleted records
        if (model.softDelete) {
          rows = rows.filter((r: any) => !r.deleted_at)
          total = await col.count() // recalculate
        }

        const includes = query.include ? query.include.split(",").map((s: string) => s.trim()).filter(Boolean) : []
        const user = c.get("user")
        const filtered = filterByPermission(rows, user)
        await attachIncludes(filtered, model, includes, models, database)

        return c.json({ data: filtered, pagination: { page, limit, total, totalPages } })
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })

    // Bulk operations (must be before /:id routes)
    app.post(basePath + "/bulk", async (c) => {
      try {
        const body = await c.req.json() as any[]
        if (!Array.isArray(body)) return c.json({ error: "Expected array" }, 400)
        const results = []
        for (const item of body) {
          const created = await col.insert(item)
          results.push(created || item)
        }
        return c.json({ created: results.length, data: results }, 201)
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })

    app.put(basePath + "/bulk", async (c) => {
      try {
        const body = await c.req.json() as { id: any; data: Record<string, any> }[]
        if (!Array.isArray(body)) return c.json({ error: "Expected array" }, 400)
        const results = []
        for (const { id, data } of body) {
          await col.update(id, data)
          const updated = await col.findById(id)
          if (updated) results.push(updated)
        }
        return c.json({ updated: results.length, data: results })
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })

    app.delete(basePath + "/bulk", async (c) => {
      try {
        const body = await c.req.json() as { ids: any[] }
        const ids = body.ids || (Array.isArray(body) ? body : [])
        for (const id of ids) {
          await col.deleteById(id)
        }
        return c.json({ deleted: ids.length })
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })

    // Export (must be before /:id routes)
    app.get(basePath + "/export", async (c) => {
      try {
        const format = c.req.query("format") || "json"
        const allRows = await col.find("id", "ASC", 0, 0)

        if (format === "csv") {
          if (allRows.length === 0) return c.text("", 200, { "Content-Type": "text/csv" })
          const headers = Object.keys(allRows[0]).filter(k => k !== "password")
          const csv = [
            headers.join(","),
            ...allRows.map((row: any) => headers.map(h => {
              const val = row[h]
              if (val === null || val === undefined) return ""
              const str = String(val)
              return str.includes(",") || str.includes('"') ? '"' + str.replace(/"/g, '""') + '"' : str
            }).join(",")),
          ].join("\n")
          return c.text(csv, 200, { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=" + model.tableName + ".csv" })
        }

        if (format === "xlsx") {
          const headers = allRows.length > 0 ? Object.keys(allRows[0]).filter(k => k !== "password") : ["id"]

          // Generate XLSX-compatible XML SpreadsheetML
          const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${model.tableName}">
    <Table>
      <Row>
        ${headers.map(h => `<Cell><Data ss:Type="String">${h.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Data></Cell>`).join("")}
      </Row>
      ${allRows.map((row: any) => `
      <Row>
        ${headers.map(h => {
          const val = row[h]
          if (val === null || val === undefined) return '<Cell><Data ss:Type="String"></Data></Cell>'
          const str = String(val)
          const isNum = /^-?\d+\.?\d*$/.test(str)
          return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${str.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Data></Cell>`
        }).join("")}
      </Row>`).join("")}
    </Table>
  </Worksheet>
</Workbook>`
          return c.text(xml, 200, {
            "Content-Type": "application/vnd.ms-excel",
            "Content-Disposition": "attachment; filename=" + model.tableName + ".xls",
          })
        }

        return c.json(allRows)
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })

    // Import (accepts JSON, CSV, XLSX)
    app.post(basePath + "/import", async (c) => {
      try {
        const ct = (c.req.header("content-type") || "").toLowerCase()
        let data: Record<string, any>[] = []
        const nonRelFields = model.fields.filter((f: any) => !f.isRelation && f.name !== "password" && f.name !== "id")

        if (ct.includes("multipart/form-data") || ct.includes("x-www-form-urlencoded")) {
          const body = await c.req.parseBody()
          const file = body.file as any
          if (file instanceof File) {
            const text = await file.text()
            const ext = file.name?.split(".").pop()?.toLowerCase()

            if (ext === "json") {
              data = JSON.parse(text)
            } else if (ext === "csv" || ext === "") {
              const lines = text.split("\n").filter(Boolean)
              const headers = lines[0].split(",").map((h: string) => h.trim().replace(/^"/, "").replace(/"$/, ""))
              data = lines.slice(1).map((line: string) => {
                const values = line.split(",").map((v: string) => v.trim().replace(/^"/, "").replace(/"$/, ""))
                const row: Record<string, any> = {}
                headers.forEach((h: string, i: number) => { row[h] = values[i] || null })
                return row
              })
            } else {
              return c.json({ error: "Unsupported file format: " + ext }, 400)
            }
          } else {
            return c.json({ error: "No file uploaded" }, 400)
          }
        } else {
          // JSON body
          data = await c.req.json()
          if (!Array.isArray(data)) data = [data]
        }

        const results = []
        let created = 0
        for (const item of data) {
          const record: Record<string, any> = {}
          for (const field of nonRelFields) {
            if (item[field.name] !== undefined) {
              let val = item[field.name]
              if (field.type === "int") val = parseInt(val)
              else if (field.type === "float") val = parseFloat(val)
              record[field.name] = val
            }
          }
          if (Object.keys(record).length > 0) {
            const inserted = await col.insert(record)
            if (inserted) { results.push(inserted); created++ }
          }
        }

        return c.json({ imported: created, total: data.length, data: results }, 201)
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })

    app.get(basePath + "/:id", async (c) => {
      try {
        const id = c.req.param("id")
        const pr = await checkPolicy(c, policies.read || defaultPol, auth, authModel, model)
        if (pr !== true) return pr
        const row = await col.findById(id)
        if (!row) return c.json(null, 404)

        // Scoped: verify org
        if (model.isScoped) {
          const org = getOrg(c)
          if (!org) return c.json({ error: "X-Org-ID header required" }, 400)
          if (row.orgId !== org.id) return c.json({ error: "Forbidden" }, 403)
        }

        const po = await checkOwner(c, policies.read || defaultPol, row, model)
        if (po !== true) return po
        const inc = c.req.query("include") || ""
        const includes = inc ? inc.split(",").map((s: string) => s.trim()).filter(Boolean) : []
        await attachIncludes([row], model, includes, models, database)
        const user = c.get("user")
        return c.json(filterByPermission([row], user)[0])
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })

    async function parseMultipart(c: any): Promise<Record<string, any>> {
      const ct = (c.req.header("content-type") || "").toLowerCase()
      if (!ct.includes("multipart/form-data")) return c.req.json()
      const body = await c.req.parseBody() as Record<string, any>
      const result: Record<string, any> = {}
      const fileFields = model.fields.filter(f => f.type === "file").map(f => f.name)
      for (const [key, val] of Object.entries(body)) {
        if (val instanceof File && fileFields.includes(key)) {
          const ext = val.name?.split(".").pop() || "bin"
          const name = model.tableName + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext
          const buf = new Uint8Array(await val.arrayBuffer())
          result[key] = await platform.storage.upload(name, buf)
        } else if (typeof val === "string") {
          result[key] = val
        }
      }
      return result
    }

    app.post(basePath, async (c) => {
      try {
        const pc = await checkPolicy(c, policies.create || defaultPol, auth, authModel, model)
        if (pc !== true) return pc
        const body = await parseMultipart(c)
        if (authModel) delete body.password

        // UUID v7: auto-generate id if not provided
        if (model.idType === "uuid" && !body.id) {
          const { uuidv7 } = await import("./uuid")
          body.id = uuidv7()
        }

        // Scoped: auto-set orgId
        if (model.isScoped) {
          const org = getOrg(c)
          if (!org) return c.json({ error: "X-Org-ID header required" }, 400)
          body.orgId = org.id
        }

        // Apply default values for missing fields
        for (const field of model.fields) {
          if (field.defaultValue !== undefined && body[field.name] === undefined) {
            body[field.name] = field.defaultValue
          }
        }

        const errs = validateFields(model.fields, body)
        if (errs.length > 0) return c.json({ error: "Validation failed", errors: errs }, 400)
        const created = await col.insert(body)
        if (created) {
          realtime.publish(model.tableName + ":created", created)
          emit(model.tableName + ":created", created).catch(() => {})
          fireWebhookEvent(database as any, model.tableName + ":created", model.tableName, created).catch(() => {})
          const sp = getSearchProvider()
          if (sp) indexModelRecord(sp, model, created).catch(() => {})
          const au = c.get("user")
          try { logAudit(database as any, au?.id, au?.name || au?.email, model.tableName, created.id, "create", undefined, created, c.req.header("x-forwarded-for")) } catch {}
        }
        return c.json(created || body, 201)
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })

    app.put(basePath + "/:id", async (c) => {
      try {
        const id = c.req.param("id")
        const existing = await col.findById(id)
        if (!existing) return c.json({ error: "Not found" }, 404)

        // Scoped: verify org
        if (model.isScoped) {
          const org = getOrg(c)
          if (!org) return c.json({ error: "X-Org-ID header required" }, 400)
          if (existing.orgId !== org.id) return c.json({ error: "Forbidden" }, 403)
        }

        const pu = await checkPolicy(c, policies.update || defaultPol, auth, authModel, model, existing)
        if (pu !== true) return pu
        const po = await checkOwner(c, policies.update || defaultPol, existing, model)
        if (po !== true) return po
        const body = await parseMultipart(c)
        const errs = validateFields(model.fields, body)
        if (errs.length > 0) return c.json({ error: "Validation failed", errors: errs }, 400)
        await col.update(id, body)
        const updated = await col.findById(id)
        if (updated) {
          realtime.publish(model.tableName + ":updated", updated)
          emit(model.tableName + ":updated", updated).catch(() => {})
          fireWebhookEvent(database as any, model.tableName + ":updated", model.tableName, updated).catch(() => {})
          const sp = getSearchProvider()
          if (sp) indexModelRecord(sp, model, updated).catch(() => {})
          const au = c.get("user")
          try { logAudit(database as any, au?.id, au?.name || au?.email, model.tableName, id, "update", existing, updated, c.req.header("x-forwarded-for")) } catch {}
        }
        return c.json(updated || null)
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })

    // Restore endpoint (only for soft delete)
    if (model.softDelete) {
      app.post(basePath + "/:id/restore", async (c) => {
        try {
          const id = c.req.param("id")
          const row = await col.findById(id)
          if (!row) return c.json({ error: "Not found" }, 404)
          await col.update(id, { deleted_at: null })
          realtime.publish(model.tableName + ":restored", row)
          emit(model.tableName + ":restored", row).catch(() => {})
          return c.json({ success: true })
        } catch (err: any) {
          return c.json({ error: err.message }, 500)
        }
      })

      app.delete(basePath + "/:id/permanent", async (c) => {
        try {
          const id = c.req.param("id")
          await col.deleteById(id)
          return c.json({ success: true })
        } catch (err: any) {
          return c.json({ error: err.message }, 500)
        }
      })
    }

    app.delete(basePath + "/:id", async (c) => {
      try {
        const id = c.req.param("id")
        const existing = await col.findById(id)
        if (!existing) return c.json({ error: "Not found" }, 404)

        // Scoped: verify org
        if (model.isScoped) {
          const org = getOrg(c)
          if (!org) return c.json({ error: "X-Org-ID header required" }, 400)
          if (existing.orgId !== org.id) return c.json({ error: "Forbidden" }, 403)
        }

        const pd = await checkPolicy(c, policies.delete || defaultPol, auth, authModel, model, existing)
        if (pd !== true) return pd
        const po = await checkOwner(c, policies.delete || defaultPol, existing, model)
        if (po !== true) return po

        const au = c.get("user")
        if (model.softDelete) {
          await col.update(id, { deleted_at: new Date().toISOString() })
          const delData = { id: parseInt(id), softDelete: true }
          realtime.publish(model.tableName + ":deleted", delData)
          emit(model.tableName + ":deleted", delData).catch(() => {})
          fireWebhookEvent(database as any, model.tableName + ":deleted", model.tableName, delData).catch(() => {})
          try { logAudit(database as any, au?.id, au?.name || au?.email, model.tableName, id, "soft_delete", existing, { deleted_at: new Date().toISOString() }, c.req.header("x-forwarded-for")) } catch {}
          return c.json({ success: true, softDelete: true })
        }

        await col.deleteById(id)
        const delData = { id: parseInt(id) }
        realtime.publish(model.tableName + ":deleted", delData)
        emit(model.tableName + ":deleted", delData).catch(() => {})
        fireWebhookEvent(database as any, model.tableName + ":deleted", model.tableName, delData).catch(() => {})
        const sp = getSearchProvider()
        if (sp) removeModelIndex(sp, model, parseInt(id)).catch(() => {})
        try { logAudit(database as any, au?.id, au?.name || au?.email, model.tableName, id, "delete", existing, undefined, c.req.header("x-forwarded-for")) } catch {}
        return c.json({ success: true })
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })

  }

  // Register action routes: /api/actions/{module}/{handler}
  if (actions) {
    for (const [moduleName, handlers] of Object.entries(actions)) {
      for (const [handlerName, action] of Object.entries(handlers)) {
        const path = "/api/actions/" + moduleName + "/" + handlerName

        app.all(path, async (c: any) => {
          try {
            const cp = await checkPolicy(c, action.policy, auth, authModel)
            if (cp !== true) return cp
            return action.handler(c)
          } catch (err: any) {
            return c.json({ error: err.message }, 500)
          }
        })
      }
    }
  }

  return app
}

// -- Org scoping helpers --

function getOrg(c: any): { id: number; role: string } | null {
  // Try from middleware first, then directly from header
  const fromCtx = c.get?.("org")
  if (fromCtx) return fromCtx

  const orgHeader = c.req?.header?.("X-Org-ID") || c.req?.header?.("x-org-id") || ""
  const orgQuery = c.req?.query?.("orgId") || ""
  const orgId = orgHeader || orgQuery
  if (orgId) {
    const parsed = parseInt(orgId)
    if (!isNaN(parsed)) return { id: parsed, role: "" }
  }
  return null
}

// -- Attach includes --

async function attachIncludes(rows: any[], model: any, includes: string[], models: any[], database: any) {
  if (!includes.length) return
  for (const row of rows) {
    for (const field of model.fields) {
      if (!field.isRelation || !includes.includes(field.name)) continue
      const refModel = models.find((m: any) => m.name === field.relationModel)
      if (!refModel || field.relationType !== "belongsTo") continue
      const fk = row[field.name + "Id"]
      row[field.name] = fk ? await database.collection(refModel.tableName).findById(fk) || null : null
    }
  }
}
