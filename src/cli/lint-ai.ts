import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function lintAiCommand() {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")
  if (!existsSync(appYamlPath)) { console.error("[Zorux] No app.yaml found"); process.exit(1) }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)
  const issues: { severity: "error" | "warn"; msg: string; fix?: string }[] = []
  const pkgPath = join(rootDir, "package.json")
  let pkg: any = {}
  if (existsSync(pkgPath)) try { pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) } catch {}
  const deps = { ...pkg.dependencies, ...pkg.devDependencies } || {}

  // 1. Manual CRUD for declared models
  const routesDir = join(rootDir, "routes")
  if (existsSync(routesDir)) {
    const files = readdirSync(routesDir).filter(f => f.endsWith(".ts"))
    for (const f of files) {
      const content = readFileSync(join(routesDir, f), "utf-8")
      for (const m of modelNames) {
        if (content.toLowerCase().includes(`/${m.toLowerCase()}s`)) {
          issues.push({
            severity: "error",
            msg: `Manual CRUD route in routes/${f} for model "${m}" — Zorux generates this automatically`,
            fix: "Remove routes/${f} and configure policies in app.yaml"
          })
        }
      }
    }
  }

  // 2. Express/Fastify installed unnecessarily
  for (const dep of Object.keys(deps)) {
    if (["express", "fastify", "koa", "restify"].includes(dep)) {
      issues.push({
        severity: "error",
        msg: `"${dep}" installed — Zorux provides routing via Hono (built-in)`,
        fix: `npm uninstall ${dep} and use plugins/*.ts for custom routes`
      })
    }
  }

  // 3. Prisma/Drizzle duplicating app.yaml
  if (existsSync(join(rootDir, "prisma", "schema.prisma"))) {
    issues.push({
      severity: "error",
      msg: "Prisma schema detected — models are defined in app.yaml",
      fix: "Remove prisma/ directory, use app.yaml for all models"
    })
  }
  for (const dep of Object.keys(deps)) {
    if (["prisma", "@prisma/client", "drizzle-orm", "drizzle-kit"].includes(dep)) {
      issues.push({
        severity: "error",
        msg: `"${dep}" installed — Zorux manages database schema from app.yaml`,
        fix: `npm uninstall ${dep}`
      })
    }
  }

  // 4. Auth libraries installed unnecessarily
  for (const dep of Object.keys(deps)) {
    if (["passport", "passport-*", "bcrypt", "bcryptjs", "jsonwebtoken", "next-auth", "auth0"].includes(dep) || dep.startsWith("passport-")) {
      issues.push({
        severity: "warn",
        msg: `"${dep}" installed — Zorux has 35+ built-in OAuth providers`,
        fix: `npm uninstall ${dep}; configure auth in app.yaml`
      })
    }
  }

  // 5. Any in actions/plugins
  for (const dir of ["actions", "plugins"]) {
    const d = join(rootDir, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d).filter(f => f.endsWith(".ts"))) {
      const content = readFileSync(join(d, f), "utf-8")
      const anyMatches = content.match(/\bany\b/g)
      if (anyMatches && anyMatches.length > 5) {
        issues.push({
          severity: "warn",
          msg: `${dir}/${f} uses "any" ${anyMatches.length} times — prefer specific types`,
          fix: "Replace 'any' with proper TypeScript types"
        })
      }
    }
  }

  // 6. Empty catch blocks
  for (const dir of ["actions", "plugins", "web"]) {
    const d = join(rootDir, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d).filter(f => f.endsWith(".ts") || f.endsWith(".tsx"))) {
      const content = readFileSync(join(d, f), "utf-8")
      if (content.includes("catch {}") || content.includes("catch(){}")) {
        issues.push({
          severity: "warn",
          msg: `${dir}/${f} has empty catch block — errors will be silently ignored`,
          fix: "Add error handling or logging to the catch block"
        })
      }
    }
  }

  // 7. Large files
  for (const dir of ["actions", "plugins"]) {
    const d = join(rootDir, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d).filter(f => f.endsWith(".ts"))) {
      const fp = join(d, f)
      const lines = readFileSync(fp, "utf-8").split("\n").length
      if (lines > 300) {
        issues.push({
          severity: "warn",
          msg: `${dir}/${f} is ${lines} lines — consider splitting into smaller modules`,
          fix: "Split into separate files by concern"
        })
      }
    }
  }

  // 8. Hardcoded secrets
  for (const dir of ["actions", "plugins"]) {
    const d = join(rootDir, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d).filter(f => f.endsWith(".ts"))) {
      const content = readFileSync(join(d, f), "utf-8")
      const patterns = [/sk_live_/, /sk_test_/, /AKIA[A-Z0-9]{16}/, /-----BEGIN (RSA |EC )?PRIVATE KEY-----/]
      for (const pat of patterns) {
        if (pat.test(content)) {
          issues.push({
            severity: "error",
            msg: `${dir}/${f} may contain hardcoded secrets`,
            fix: "Use environment variables via process.env"
          })
        }
      }
    }
  }

  // 9. Generated file edited
  for (const dir of [".zorux", "dist"]) {
    const d = join(rootDir, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d, { recursive: true }).filter(f => f.endsWith(".ts") || f.endsWith(".tsx"))) {
      issues.push({
        severity: "warn",
        msg: `${dir}/${f} is a generated file that should not be edited`,
        fix: "Edit app.yaml or actions/*.ts instead"
      })
    }
  }

  // 10. fetch without SDK
  for (const dir of ["actions", "plugins"]) {
    const d = join(rootDir, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d).filter(f => f.endsWith(".ts"))) {
      const content = readFileSync(join(d, f), "utf-8")
      const fetchMatches = content.match(/\bfetch\(/g)
      if (fetchMatches && fetchMatches.length > 2) {
        issues.push({
          severity: "warn",
          msg: `${dir}/${f} uses fetch() ${fetchMatches.length} times — prefer Zorux SDK or models API`,
          fix: "Use ctx.models.* or the generated SDK client"
        })
      }
    }
  }

  // 11. Direct SQL strings
  for (const dir of ["actions", "plugins"]) {
    const d = join(rootDir, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d).filter(f => f.endsWith(".ts"))) {
      const content = readFileSync(join(d, f), "utf-8")
      if (/\b(SELECT|INSERT|UPDATE|DELETE)\b\s/.test(content) && !content.includes("prepare")) {
        issues.push({
          severity: "warn",
          msg: `${dir}/${f} has raw SQL — use Zorux model API instead`,
          fix: "Use ctx.models.* for database operations"
        })
      }
    }
  }

  // 12. Public route without rate limit
  for (const [name, m] of Object.entries(models)) {
    const def = m as any
    if (def.policies?.create === "*" || def.policies?.list === "*") {
      issues.push({
        severity: "warn",
        msg: `Model "${name}" has public "${def.policies.create === "*" ? "create" : "list"}" with no rate limit — vulnerable to abuse`,
        fix: "Add rate limiting via app.yaml or use zorux add package rate-limiter"
      })
    }
  }

  // Print
  if (issues.length === 0) {
    console.log("\n  ✅ No AI quality issues detected — project looks clean\n")
    return
  }

  console.log(`\n  🧪 AI Lint — ${issues.length} issue(s)\n`)
  for (const issue of issues) {
    const icon = issue.severity === "error" ? "❌" : "⚠️"
    console.log(`  ${icon}  ${issue.msg}`)
    if (issue.fix) console.log(`     → ${issue.fix}`)
  }
  console.log()
}
