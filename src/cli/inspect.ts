import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function inspectCommand(args: string[]) {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)

  const manifest = {
    name: config.name || "unnamed",
    type: config.type || "api",
    models: modelNames.map((name: string) => ({
      name,
      fields: Object.keys(models[name].fields || {}),
      hasAuth: !!models[name].auth,
      policies: models[name].policies || {},
    })),
    auth: config.auth
      ? { model: config.auth.model, registration: config.auth.registration }
      : null,
    database: config.database?.provider || "sqlite",
    features: {
      admin: config.type === "fullstack" || config.type === "web",
      graphql: !!config.graphql,
      realtime: !!config.realtime,
      jobs: true,
    },
    routes: getGeneratedRoutes(config, modelNames),
    plugins: config.plugins || [],
  }

  if (args.includes("--json")) {
    // Write manifest
    const dotDir = join(rootDir, ".zorux")
    mkdirSync(dotDir, { recursive: true })
    writeFileSync(join(dotDir, "manifest.json"), JSON.stringify(manifest, null, 2))
    console.log("  📋 Manifest written to .zorux/manifest.json")
    return
  }

  // Human output
  console.log(`\n  📋 ${manifest.name} — ${manifest.type}`)
  console.log(`  Database: ${manifest.database}\n`)

  console.log("  Models:")
  for (const m of manifest.models) {
    const auth = m.hasAuth ? " 🔐" : ""
    console.log(`    ${m.name}${auth} — ${m.fields.length} fields, ${Object.keys(m.policies).length} policies`)
  }

  console.log("\n  Auth:", manifest.auth ? `${manifest.auth.model} (${manifest.auth.registration})` : "none")
  console.log("  Features:", Object.entries(manifest.features).filter(([_, v]) => v).map(([k]) => k).join(", ") || "none")
  if (manifest.plugins.length > 0) console.log("  Plugins:", manifest.plugins.join(", "))
  console.log("  Routes:", manifest.routes.length)
  console.log()
}

function getGeneratedRoutes(config: any, models: string[]): string[] {
  const routes: string[] = []
  for (const m of models) {
    const plural = (config.models?.[m]?.plural || m.toLowerCase() + "s").replace(/ss$/, "s")
    routes.push(`GET /api/${plural}`)
    routes.push(`POST /api/${plural}`)
    routes.push(`GET /api/${plural}/:id`)
    routes.push(`PUT /api/${plural}/:id`)
    routes.push(`DELETE /api/${plural}/:id`)
  }
  if (config.type !== "api") {
    routes.push("GET /admin")
    routes.push("GET /login")
    routes.push("GET /register")
  }
  if (config.graphql) routes.push("POST /api/graphql")
  if (config.auth) {
    routes.push("POST /api/auth/login")
    routes.push("POST /api/auth/register")
    routes.push("GET /api/auth/me")
  }
  return routes
}
