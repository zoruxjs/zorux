import { existsSync, readFileSync, readdirSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function lintAgentCommand() {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const issues: string[] = []
  const pkgPath = join(rootDir, "package.json")
  let pkg: any = {}
  if (existsSync(pkgPath)) {
    try { pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) } catch {}
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies } || {}

  // 1. Check for unnecessary packages
  const unnecessary: Record<string, string> = {
    express: "Zorux uses Hono (built into runtime via app)",
    prisma: "Models are defined in app.yaml — no Prisma needed",
    "@prisma/client": "Models are defined in app.yaml — no Prisma needed",
    next: "Zorux uses web/pages/*.tsx for frontend",
    passport: "Zorux has 35 OAuth providers built-in",
    "passport-*": "Zorux has 35 OAuth providers built-in",
    bcrypt: "Zorux handles password hashing internally",
    "jsonwebtoken": "Zorux handles JWT internally",
    vitest: "Zorux uses bun:test",
    jest: "Zorux uses bun:test",
    mocha: "Zorux uses bun:test",
  }

  for (const [dep, reason] of Object.entries(unnecessary)) {
    const depName = dep.replace("passport-*", "passport")
    for (const installed of Object.keys(deps)) {
      if (dep.endsWith("*")) {
        if (installed.startsWith(dep.replace("-*", ""))) {
          issues.push(`Package "${installed}" detected: ${reason}`)
        }
      } else if (installed === dep || installed.startsWith(dep + "-")) {
        issues.push(`Package "${installed}" detected: ${reason}`)
      }
    }
  }

  // 2. Check for CRUD manual files
  const apiDir = join(rootDir, "api") || join(rootDir, "routes")
  if (existsSync(join(rootDir, "routes"))) {
    const files = readdirSync(join(rootDir, "routes")).filter(f => f.endsWith(".ts"))
    const models = Object.keys(config.models || {})
    const suspect = files.filter(f => models.some(m => f.toLowerCase().includes(m.toLowerCase())))
    if (suspect.length > 0) {
      issues.push(`Manual CRUD routes detected (routes/${suspect.join(", ")}) — models are auto-generated`)
    }
  }

  // 3. Check for manual auth middleware
  if (existsSync(join(rootDir, "middleware"))) {
    const files = readdirSync(join(rootDir, "middleware")).filter(f => f.includes("auth"))
    if (files.length > 0) {
      issues.push(`Manual auth middleware (middleware/${files.join(", ")}) — Zorux auth is built-in`)
    }
  }

  // 4. Check for Prisma schema
  if (existsSync(join(rootDir, "prisma", "schema.prisma"))) {
    issues.push("Prisma schema detected — use app.yaml models instead")
  }

  // 5. Check for Express server
  for (const f of ["server.js", "server.ts", "app.js", "app.ts", "index.js", "index.ts"]) {
    if (existsSync(join(rootDir, f))) {
      const content = readFileSync(join(rootDir, f), "utf-8")
      if (content.includes("express") || content.includes("listen")) {
        issues.push(`Manual server (${f}) — use zorux dev or plugins/*.ts`)
        break
      }
    }
  }

  if (issues.length === 0) {
    console.log("\n  ✅ No agent issues detected — project is AI-friendly\n")
    return
  }

  console.log(`\n  🧹 Agent Lint — ${issues.length} issue(s)\n`)
  for (const issue of issues) {
    console.log(`  ⚠️  ${issue}`)
  }
  console.log(`\n  Run \`zorux doctor\` for full project diagnostic\n`)
}
