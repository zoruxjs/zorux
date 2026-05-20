import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function tokenReportCommand(args: string[]) {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)

  // Count tokens in real project files
  const appYamlTokens = approxTokens(readFileSync(appYamlPath, "utf-8"))

  // Estimate traditional framework equivalent
  const totalModels = modelNames.length
  const totalFields = modelNames.reduce((sum, n) => sum + Object.keys(models[n].fields || {}).length, 0)
  const hasAuth = !!config.auth
  const hasAdmin = config.type !== "api"
  const hasOrg = !!config.auth?.organization?.enabled
  const totalPlugins = (config.plugins || []).length

  // Traditional framework cost estimation (routes + controllers + forms + migrations + tests)
  const boilerplatePerModel = {
    routes: 80,      // 5 CRUD routes × 16 tokens each
    controller: 120,  // controller file
    migration: 40,   // table creation
    form: 100,       // admin form
    test: 150,       // CRUD test
  }
  const boilerplateAuth = hasAuth ? 600 : 0
  const boilerplateAdmin = hasAdmin ? 400 : 0
  const boilerplateOrg = hasOrg ? 300 : 0
  const boilerplateConfig = 200

  const tradTokens = totalModels * Object.values(boilerplatePerModel).reduce((a, b) => a + b, 0) + boilerplateAuth + boilerplateAdmin + boilerplateOrg + boilerplateConfig
  const saved = tradTokens - appYamlTokens
  const savedPct = Math.round((saved / tradTokens) * 100)

  // Custom code estimate (actions, jobs, plugins, web pages)
  let customTokens = 0
  const customFiles: string[] = []
  for (const dir of ["actions", "jobs", "plugins"]) {
    const d = join(rootDir, dir)
    if (existsSync(d)) {
      for (const f of readdirSync(d).filter(f => f.endsWith(".ts"))) {
        const c = readFileSync(join(d, f), "utf-8")
        customTokens += approxTokens(c)
        customFiles.push(`${dir}/${f}`)
      }
    }
  }
  const webDir = join(rootDir, "web", "pages")
  if (existsSync(webDir)) {
    for (const f of readdirSync(webDir).filter(f => f.endsWith(".tsx"))) {
      const c = readFileSync(join(webDir, f), "utf-8")
      customTokens += approxTokens(c)
      customFiles.push(`web/pages/${f}`)
    }
  }

  console.log(`\n  📊 ${config.name || "Zorux App"} — Token Report\n`)

  console.log("  App Contract (Zorux):")
  console.log(`    app.yaml:          ${appYamlTokens.toString().padStart(5)} tokens`)
  if (customTokens > 0) {
    console.log(`    Custom code:       ${customTokens.toString().padStart(5)} tokens  (${customFiles.length} files)`)
  }
  console.log(`    ${(customTokens > 0 ? "───".padStart(9) : "───".padStart(9))}`)
  console.log(`    Total Zorux:       ${(appYamlTokens + customTokens).toString().padStart(5)} tokens`)

  console.log("\n  Traditional Equivalent:")
  const breakdown: [string, number][] = [
    ["Models × CRUD (routes + controller + migration + form + test)", totalModels * Object.values(boilerplatePerModel).reduce((a, b) => a + b, 0)],
  ]
  if (hasAuth) breakdown.push(["Auth system (register, login, sessions, OAuth)", boilerplateAuth])
  if (hasAdmin) breakdown.push(["Admin panel (dashboard, list, form, actions)", boilerplateAdmin])
  if (hasOrg) breakdown.push(["Organizations (multi-tenant, invites, roles)", boilerplateOrg])
  breakdown.push(["Config files (package.json, tsconfig, env, CI)", boilerplateConfig])

  for (const [label, tokens] of breakdown) {
    console.log(`    ${label.padEnd(55)} ${tokens.toString().padStart(5)} tokens`)
  }
  console.log(`    ${"───".padStart(71)}`)
  console.log(`    ${"Total Traditional".padEnd(55)} ${tradTokens.toString().padStart(5)} tokens`)

  console.log(`\n  📈 Savings:`)
  console.log(`    ${savedPct}% less tokens (${saved.toLocaleString()} tokens saved)`)
  console.log(`    Zorux: ${appYamlTokens} tokens → API + Admin${hasAuth ? " + Auth" : ""}${hasOrg ? " + Orgs" : ""} + CRUD`)
  console.log(`    Other: ${tradTokens} tokens → same scope, manually coded`)

  if (customFiles.length > 0) {
    console.log(`\n  Custom Code (${customFiles.length} files):`)
    for (const f of customFiles) {
      const fp = join(rootDir, f)
      const tokens = approxTokens(existsSync(fp) ? readFileSync(fp, "utf-8") : "")
      console.log(`    ${f.padEnd(30)} ${tokens.toString().padStart(4)} tokens`)
    }
  }

  console.log()
}

function approxTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 chars for code/text
  return Math.max(1, Math.ceil(text.length / 4))
}
