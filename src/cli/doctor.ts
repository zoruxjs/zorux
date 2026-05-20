import { readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"
import { getVersion } from "../core/version"

export async function doctorCommand(args: string[]) {
  const rootDir = process.cwd()
  const issues: { level: "error" | "warn" | "info"; msg: string }[] = []
  const verbose = args.includes("--verbose") || args.includes("-v")

  console.log(`\n  🔍 Zorux Doctor v${getVersion()}\n`)

  // 1. Node version
  const nodeVer = process.version
  issues.push({ level: "info", msg: `Node ${nodeVer}, Bun ${typeof Bun !== "undefined" ? Bun.version : "N/A"}` })

  // 2. app.yaml
  const appYamlPath = join(rootDir, "app.yaml")
  if (!existsSync(appYamlPath)) {
    issues.push({ level: "error", msg: "app.yaml not found in current directory" })
    printReport(issues)
    process.exit(1)
  }
  issues.push({ level: "info", msg: "app.yaml found" })

  // 3. Parse YAML
  let config: any
  try {
    config = load(readFileSync(appYamlPath, "utf-8"))
    issues.push({ level: "info", msg: "app.yaml parsed successfully" })
  } catch (e: any) {
    issues.push({ level: "error", msg: `app.yaml parse error: ${e.message}` })
    printReport(issues)
    process.exit(1)
  }

  // 4. Package.json
  const pkgPath = join(rootDir, "package.json")
  if (!existsSync(pkgPath)) {
    issues.push({ level: "error", msg: "package.json not found" })
  } else {
    issues.push({ level: "info", msg: "package.json found" })
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
      if (pkg.dependencies?.zorux) {
        issues.push({ level: "info", msg: `zorux dependency: ${pkg.dependencies.zorux}` })
      } else {
        issues.push({ level: "warn", msg: "zorux not in package.json dependencies" })
      }
    } catch {
      issues.push({ level: "error", msg: "package.json is not valid JSON" })
    }
  }

  // 5. Node modules
  if (!existsSync(join(rootDir, "node_modules"))) {
    issues.push({ level: "warn", msg: "node_modules not found — run bun install" })
  } else {
    issues.push({ level: "info", msg: "node_modules installed" })
  }

  // 6. Database
  if (config.database?.provider) {
    const db = config.database.provider
    issues.push({ level: "info", msg: `Database: ${db}` })
    if (db === "postgres" || db === "mysql") {
      const url = config.database?.url || process.env.DATABASE_URL
      if (!url) issues.push({ level: "warn", msg: `DATABASE_URL not set for ${db}` })
    }
  }

  // 7. Auth model
  if (config.auth) {
    const authModel = config.auth.model
    const models = config.models || {}
    if (!models[authModel]) {
      issues.push({ level: "error", msg: `Auth model "${authModel}" not found in models` })
    } else {
      issues.push({ level: "info", msg: `Auth model: ${authModel}` })
    }
    if (!process.env.JWT_SECRET && config.auth.registration !== "disabled") {
      issues.push({ level: "warn", msg: "JWT_SECRET not set — using dev default" })
    }
  }

  // 8. Models
  const models = config.models || {}
  const modelNames = Object.keys(models)
  if (modelNames.length === 0) {
    issues.push({ level: "warn", msg: "No models defined" })
  } else {
    issues.push({ level: "info", msg: `${modelNames.length} models: ${modelNames.join(", ")}` })
  }

  // 9. Model field checks
  for (const [name, m] of Object.entries(models)) {
    const def = m as any
    const fields = Object.keys(def.fields || {})
    for (const f of fields) {
      const val = def.fields[f]
      if (typeof val === "string" && val.includes("unique") && !val.includes("required") && val.includes("string") && val.includes("email")) {
        // Check common issues
      }
    }
    // Check unused auth reference
    if (name === config.auth?.model && def.auth !== "password") {
      issues.push({ level: "warn", msg: `${name} is auth model but has no password auth` })
    }
  }

  // 10. Port
  const port = parseInt(args.find(a => a.startsWith("--port="))?.split("=")[1] || "") || parseInt(process.env.PORT || "3000")
  issues.push({ level: "info", msg: `Port: ${port}` })

  // 11. Plugins
  const plugins = config.plugins || []
  if (plugins.length > 0) {
    for (const p of plugins) {
      const pluginPath = join(rootDir, "plugins", `${p}.ts`)
      if (!existsSync(pluginPath) && !p.startsWith("kai-plugin-")) {
        issues.push({ level: "warn", msg: `Plugin "${p}" file not found at plugins/${p}.ts` })
      }
    }
  }

  // 12. Web pages
  const webPagesDir = join(rootDir, "web", "pages")
  if (existsSync(webPagesDir)) {
    const pages = readdirSync(webPagesDir).filter(f => f.endsWith(".tsx") || f.endsWith(".ts"))
    issues.push({ level: "info", msg: `web/pages/: ${pages.length} page(s) (${pages.join(", ") || "empty"})` })
  }

  // 13. Actions
  const actionsDir = join(rootDir, "actions")
  if (existsSync(actionsDir)) {
    const actions = readdirSync(actionsDir).filter(f => f.endsWith(".ts"))
    issues.push({ level: "info", msg: `actions/: ${actions.length} action(s)` })
  }

  // 14. Environment
  const envPath = join(rootDir, ".env")
  if (!existsSync(envPath)) {
    issues.push({ level: "warn", msg: ".env not found" })
  } else {
    issues.push({ level: "info", msg: ".env found" })
  }

  printReport(issues, verbose)

  if (issues.some(i => i.level === "error")) {
    console.log("  ❌ Fix errors before running zorux dev\n")
    process.exit(1)
  }
}

function printReport(issues: { level: string; msg: string }[], verbose = false) {
  let errors = 0, warnings = 0, infos = 0
  for (const i of issues) {
    if (!verbose && i.level === "info") { infos++; continue }
    const icon = i.level === "error" ? "❌" : i.level === "warn" ? "⚠️" : "ℹ️"
    console.log(`  ${icon}  ${i.msg}`)
    if (i.level === "error") errors++
    if (i.level === "warn") warnings++
    infos++
  }
  if (!verbose && infos > 0) console.log(`  ℹ️  ${infos} info check(s) — use --verbose to see all`)
  console.log(`\n  📊 ${errors} error(s), ${warnings} warning(s)\n`)
}
