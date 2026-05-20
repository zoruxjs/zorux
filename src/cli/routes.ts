import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function routesCommand(args: string[]) {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)
  const all: { method: string; path: string; owner: string }[] = []

  // API CRUD routes
  for (const name of modelNames) {
    const plural = (models[name]?.plural || name.toLowerCase() + "s").replace(/ss$/, "s")
    all.push({ method: "GET", path: `/api/${plural}`, owner: `core:crud(${name})` })
    all.push({ method: "POST", path: `/api/${plural}`, owner: `core:crud(${name})` })
    all.push({ method: "GET", path: `/api/${plural}/:id`, owner: `core:crud(${name})` })
    all.push({ method: "PUT", path: `/api/${plural}/:id`, owner: `core:crud(${name})` })
    all.push({ method: "DELETE", path: `/api/${plural}/:id`, owner: `core:crud(${name})` })
  }

  // Bulk routes
  for (const name of modelNames) {
    const plural = (models[name]?.plural || name.toLowerCase() + "s").replace(/ss$/, "s")
    all.push({ method: "POST", path: `/api/${plural}/bulk`, owner: `core:crud(${name})` })
    all.push({ method: "PUT", path: `/api/${plural}/bulk`, owner: `core:crud(${name})` })
    all.push({ method: "DELETE", path: `/api/${plural}/bulk`, owner: `core:crud(${name})` })
    all.push({ method: "GET", path: `/api/${plural}/export`, owner: `core:crud(${name})` })
    all.push({ method: "POST", path: `/api/${plural}/import`, owner: `core:crud(${name})` })
  }

  // Auth routes
  if (config.auth) {
    all.push({ method: "POST", path: "/api/auth/register", owner: "core:auth" })
    all.push({ method: "POST", path: "/api/auth/login", owner: "core:auth" })
    all.push({ method: "GET", path: "/api/auth/me", owner: "core:auth" })
    all.push({ method: "POST", path: "/api/auth/logout", owner: "core:auth" })
    all.push({ method: "GET", path: "/api/auth/sessions", owner: "core:auth" })
    all.push({ method: "DELETE", path: "/api/auth/sessions/:id", owner: "core:auth" })
    all.push({ method: "POST", path: "/api/auth/sessions/revoke-all", owner: "core:auth" })
  }

  // OpenAPI
  all.push({ method: "GET", path: "/api/openapi.json", owner: "core:openapi" })
  all.push({ method: "GET", path: "/api/docs", owner: "core:openapi" })

  // Health
  all.push({ method: "GET", path: "/api/health", owner: "core:health" })

  // GraphQL
  if (config.graphql) {
    all.push({ method: "POST", path: "/api/graphql", owner: "core:graphql" })
  }

  // Admin
  if (config.type !== "api") {
    all.push({ method: "GET", path: "/", owner: "web:pages/index" })
    all.push({ method: "GET", path: "/admin", owner: "core:admin" })
    for (const name of modelNames) {
      const plural = (models[name]?.plural || name.toLowerCase() + "s").replace(/ss$/, "s")
      all.push({ method: "GET", path: `/admin/${plural}`, owner: "core:admin" })
      all.push({ method: "GET", path: `/admin/${plural}/new`, owner: "core:admin" })
      all.push({ method: "POST", path: `/admin/${plural}`, owner: "core:admin" })
      all.push({ method: "GET", path: `/admin/${plural}/:id/edit`, owner: "core:admin" })
      all.push({ method: "POST", path: `/admin/${plural}/:id`, owner: "core:admin" })
      all.push({ method: "POST", path: `/admin/${plural}/:id/delete`, owner: "core:admin" })
    }
    all.push({ method: "GET", path: "/admin/features", owner: "core:admin" })
    all.push({ method: "GET", path: "/admin/emails", owner: "core:admin" })
    all.push({ method: "GET", path: "/admin/monitor", owner: "core:admin" })
    all.push({ method: "GET", path: "/login", owner: "core:admin" })
    all.push({ method: "POST", path: "/login", owner: "core:admin" })
    all.push({ method: "GET", path: "/register", owner: "core:admin" })
    all.push({ method: "POST", path: "/register", owner: "core:admin" })
  }

  // Plugin routes (from plugins/)
  const pluginsDir = join(rootDir, "plugins")
  if (existsSync(pluginsDir)) {
    const { readdirSync } = await import("fs")
    const files = readdirSync(pluginsDir).filter(f => f.endsWith(".ts"))
    for (const f of files) {
      const name = f.replace(/\.ts$/, "")
      all.push({ method: "*", path: `/*`, owner: `plugin:${name}` })
    }
  }

  // Sort: core first, then plugins
  all.sort((a, b) => {
    if (a.owner < b.owner) return -1
    if (a.owner > b.owner) return 1
    return a.path.localeCompare(b.path)
  })

  // Print
  console.log(`\n  🗺️  ${config.name || "Zorux App"} — Route Map`)
  console.log(`  ${all.length} routes\n`)

  let currentOwner = ""
  for (const r of all) {
    if (r.owner !== currentOwner) {
      currentOwner = r.owner
      console.log(`  [${currentOwner}]`)
    }
    console.log(`    ${r.method.padEnd(7)} ${r.path}`)
  }
  console.log()
}
