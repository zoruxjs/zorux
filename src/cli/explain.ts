import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function explainCommand(args: string[]) {
  const target = args[1] || join(process.cwd(), "app.yaml")
  const appYamlPath = existsSync(target) ? target : join(process.cwd(), target)

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] File not found: " + target)
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)

  console.log(`\n  📖 ${config.name || "app"} — Generation Plan\n`)

  console.log("  Database:")
  console.log(`    Provider: ${config.database?.provider || "sqlite"}`)
  console.log(`    Tables to create: ${modelNames.length}`)

  if (config.auth) {
    console.log(`\n  Auth:`)
    console.log(`    Model: ${config.auth.model}`)
    console.log(`    Registration: ${config.auth.registration}`)
    console.log(`    Roles: ${(config.auth.roles || []).join(", ")}`)
    console.log(`    Auto-generated routes: login, register, me, logout`)
    if (config.auth.organization?.enabled) {
      console.log(`    Organizations: enabled (${(config.auth.organization.roles || []).join(", ")})`)
    }
  }

  console.log(`\n  Models (${modelNames.length}):`)
  for (const name of modelNames) {
    const m = models[name]
    const fields = Object.keys(m.fields || {})
    const rels = fields.filter(f => {
      const t = m.fields[f]
      return typeof t === "string" && (models[t] || m.fields[f]?.type === "relation")
    })
    const refs = modelNames.filter(n => {
      const fm = models[n]?.fields || {}
      return Object.values(fm).some((v: any) => typeof v === "string" && v === name)
    })
    console.log(`    ${name}${m.auth ? " 🔐" : ""}`)
    console.log(`      Fields: ${fields.join(", ")}`)
    if (rels.length > 0) console.log(`      Relations: ${rels.join(", ")}`)
    if (refs.length > 0) console.log(`      Referenced by: ${refs.join(", ")}`)
    if (m.policies) {
      console.log(`      Policies:`)
      for (const [action, policy] of Object.entries(m.policies)) {
        console.log(`        ${action}: ${policy}`)
      }
    }
    if (m.scoped) console.log(`      Multi-tenant: scoped`)
    if (m.softDelete) console.log(`      Soft delete: enabled`)
    if (m.timestamps) console.log(`      Timestamps: created_at, updated_at`)
  }

  console.log(`\n  Routes Generated:`)
  const routes = generateRouteList(config, modelNames)
  for (const r of routes) {
    console.log(`    ${r}`)
  }

  if (config.plugins?.length > 0) {
    console.log(`\n  Plugins: ${config.plugins.join(", ")}`)
    for (const p of config.plugins) {
      console.log(`    ${p}: routes, actions, views loaded from plugins/${p}.ts`)
    }
  }

  if (config.email) {
    console.log(`\n  Email: ${config.email.provider} (from: ${config.email.from || "noreply@" + config.name + ".com"})`)
  }

  if (config.cache) {
    console.log(`\n  Cache: ${config.cache.provider}${config.cache.ttl ? " (ttl: " + config.cache.ttl + "s)" : ""}`)
  }

  console.log(`\n  Files to create:`)
  console.log(`    app.yaml (source of truth)`)
  console.log(`    package.json`)
  console.log(`    tsconfig.json`)
  console.log(`    .env`)
  if (modelNames.length > 0) console.log(`    Database migrations (auto)`)
  if (config.plugins?.length > 0) console.log(`    Plugin files`)
  console.log()
}

function generateRouteList(config: any, models: string[]): string[] {
  const routes: string[] = []
  for (const m of models) {
    const plural = (config.models?.[m]?.plural || m.toLowerCase() + "s").replace(/ss$/, "s")
    routes.push(`GET    /api/${plural}        — List ${plural} (paginated, sortable, searchable)`)
    routes.push(`POST   /api/${plural}        — Create ${m}`)
    routes.push(`GET    /api/${plural}/:id     — Get ${m} by ID`)
    routes.push(`PUT    /api/${plural}/:id     — Update ${m}`)
    routes.push(`DELETE /api/${plural}/:id     — Delete ${m}`)
  }
  if (config.auth) {
    routes.push(`POST   /api/auth/register    — Register user`)
    routes.push(`POST   /api/auth/login       — Login`)
    routes.push(`GET    /api/auth/me          — Current user`)
    routes.push(`POST   /api/auth/logout      — Logout`)
  }
  if (config.type !== "api") {
    routes.push(`GET    /                     — Landing page (web/)`)
    routes.push(`GET    /admin                — Admin dashboard`)
    routes.push(`GET    /api/docs             — OpenAPI/Swagger docs`)
    routes.push(`GET    /login                — Login page`)
    routes.push(`GET    /register             — Register page`)
  }
  if (config.realtime?.enabled) {
    routes.push(`WS     /ws                   — WebSocket (pub/sub)`)
  }
  if (config.graphql) {
    routes.push(`POST   /api/graphql          — GraphQL endpoint`)
  }
  routes.push(`GET    /api/health            — Health check`)
  return routes
}
