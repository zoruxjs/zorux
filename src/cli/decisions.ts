import { readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function decisionsCommand(args: string[]) {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)

  console.log(`\n  🧠 ${config.name || "Zorux App"} — Decision Tree\n`)

  // Type decision
  const type = config.type || "api"
  console.log(`  Because type="${type}":`)
  if (type === "fullstack" || type === "web") {
    console.log(`    - Admin routes enabled (/admin)`)
    console.log(`    - Login/register pages enabled (/login, /register)`)
    console.log(`    - Static assets served (/static/*)`)
    console.log(`    - Landing page route (GET /)`)
  } else {
    console.log(`    - API-only mode (no admin, no pages)`)
  }

  // Auth decision
  if (config.auth) {
    const auth = config.auth
    console.log(`\n  Because auth.model="${auth.model}":`)
    console.log(`    - User registration: ${auth.registration}`)
    console.log(`    - Auth routes: /api/auth/register, /api/auth/login, /api/auth/me`)
    console.log(`    - Roles: ${(auth.roles || []).join(", ")}`)
    console.log(`    - Password min length: ${auth.passwordMinLength || 8}`)

    if (auth.social) {
      const providers = Object.keys(auth.social)
      console.log(`    - OAuth providers: ${providers.join(", ")}`)
    }
    if (auth.organization?.enabled) {
      console.log(`    - Organizations enabled`)
      console.log(`    - Org roles: ${(auth.organization.roles || []).join(", ")}`)
      console.log(`    - Models scoped by org: ${modelNames.filter(n => models[n]?.scoped).join(", ") || "none"}`)
      console.log(`    - Org invite expires: ${auth.organization.inviteExpiresIn || 7} days`)
    }
  } else {
    console.log(`\n  Because auth is not configured:`)
    console.log(`    - All API routes are public`)
    console.log(`    - No login/register pages`)
    console.log(`    - No JWT secret required`)
  }

  // Database decision
  const dbProvider = config.database?.provider || "sqlite"
  console.log(`\n  Because database.provider="${dbProvider}":`)
  if (dbProvider === "sqlite") {
    console.log(`    - No external database server needed`)
    console.log(`    - Data stored in local file`)
    console.log(`    - Best for development, single-server production`)
  } else if (dbProvider === "postgres" || dbProvider === "mysql") {
    console.log(`    - External database server required`)
    console.log(`    - Connection string from DATABASE_URL env`)
  }

  // Model decisions
  if (modelNames.length > 0) {
    console.log(`\n  Because ${modelNames.length} model(s) defined:`)
    for (const name of modelNames) {
      const m = models[name]
      const fields = Object.keys(m.fields || {})

      if (name === config.auth?.model) {
        console.log(`    - "${name}" is auth model — JWT tokens, session management`)
      }
      if (m.auth) {
        console.log(`    - "${name}" has password auth — /api/auth/login validates credentials`)
      }
      if (m.scoped) {
        console.log(`    - "${name}" is scoped — multi-tenant, filtered by X-Org-ID`)
      }
      if (m.timestamps) {
        console.log(`    - "${name}" has timestamps — created_at, updated_at auto-managed`)
      }
      if (m.softDelete) {
        console.log(`    - "${name}" has soft delete — deleted_at, restore endpoint`)
      }

      // Policies
      const policies = m.policies || {}
      for (const [action, policy] of Object.entries(policies)) {
        if (policy === "*") {
          console.log(`    - "${name}" ${action} is public ("*") — no auth required`)
        } else if (policy === "authenticated") {
          console.log(`    - "${name}" ${action} requires authentication`)
        } else if (policy === "owner") {
          console.log(`    - "${name}" ${action} restricted to record owner`)
        } else if (policy === "admin") {
          console.log(`    - "${name}" ${action} restricted to admin role`)
        }
      }
    }
  }

  // Cache decision
  if (config.cache?.provider) {
    console.log(`\n  Because cache.provider="${config.cache.provider}":`)
    console.log(`    - GET responses cached (TTL: ${config.cache.ttl || 120}s)`)
    console.log(`    - Cache invalidated on write operations`)
  }

  // Realtime decision
  if (config.realtime?.enabled) {
    console.log(`\n  Because realtime.enabled=true:`)
    console.log(`    - WebSocket server enabled at /ws`)
    console.log(`    - Pub/sub events on model CRUD`)
  }

  // Plugin decisions
  const pluginsDir = join(rootDir, "plugins")
  if (existsSync(pluginsDir)) {
    const plugins = readdirSync(pluginsDir).filter(f => f.endsWith(".ts"))
    if (plugins.length > 0) {
      console.log(`\n  Because plugins/ exists:`)
      for (const p of plugins) {
        console.log(`    - "${p.replace(/\.ts$/, "")}" plugin loaded`)
        console.log(`    - Plugin can override routes, add middleware, register hooks`)
      }
    }
  }

  // Web pages
  const webPagesDir = join(rootDir, "web", "pages")
  if (existsSync(webPagesDir)) {
    const pages = readdirSync(webPagesDir).filter(f => f.endsWith(".tsx"))
    if (pages.length > 0) {
      console.log(`\n  Because web/pages/ exists:`)
      for (const p of pages) {
        const route = p === "index.tsx" ? "/" : "/" + p.replace(/\.tsx$/, "").toLowerCase()
        console.log(`    - "${p}" → ${route} (file-based routing)`)
      }
    }
  }

  console.log()
}
