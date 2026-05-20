import { readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function verifyCommand(args: string[]) {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  console.log("\n  🔍 Zorux Verify — Checking project\n")

  if (!existsSync(appYamlPath)) {
    console.error("  ❌ app.yaml not found")
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)
  const checks: { ok: boolean; msg: string }[] = []

  // 1. YAML parsed
  checks.push({ ok: true, msg: "app.yaml parsed successfully" })

  // 2. Models defined
  if (modelNames.length > 0) {
    checks.push({ ok: true, msg: `${modelNames.length} model(s) defined: ${modelNames.join(", ")}` })
  } else {
    checks.push({ ok: true, msg: "No models defined (add some to get started)" })
  }

  // 3. Auth model exists
  if (config.auth) {
    const authModel = config.auth.model
    const hasModel = models[authModel]
    if (hasModel) {
      const passwordField = Object.keys(hasModel.fields || {}).find(k => {
        const v = hasModel.fields[k]
        return typeof v === "string" && v.includes("password")
      })
      checks.push({ ok: true, msg: `Auth model "${authModel}" exists` })
      if (!passwordField && hasModel.auth !== "password") {
        checks.push({ ok: false, msg: `Auth model "${authModel}" has no password field` })
      }
    } else {
      checks.push({ ok: false, msg: `Auth model "${authModel}" not found in models` })
    }
  }

  // 4. Database configured
  if (config.database?.provider) {
    checks.push({ ok: true, msg: `Database provider: ${config.database.provider}` })
  } else {
    checks.push({ ok: false, msg: "No database provider configured" })
  }

  // 5. Package.json
  const pkgPath = join(rootDir, "package.json")
  if (existsSync(pkgPath)) {
    checks.push({ ok: true, msg: "package.json found" })
  } else {
    checks.push({ ok: false, msg: "package.json not found — run bun init" })
  }

  // 6. Node modules
  if (existsSync(join(rootDir, "node_modules"))) {
    checks.push({ ok: true, msg: "node_modules installed" })
  } else {
    checks.push({ ok: false, msg: "node_modules not found — run bun install" })
  }

  // 7. Unique fields check
  for (const [name, m] of Object.entries(models)) {
    const def = m as any
    const fieldNames = Object.keys(def.fields || {})
    const uniqueFields = fieldNames.filter(f => {
      const val = def.fields[f]
      return typeof val === "string" && val.includes("unique")
    })
    if (uniqueFields.length > 0) {
      checks.push({ ok: true, msg: `${name}.${uniqueFields.join(", ")} — unique constraint` })
    }
  }

  // 8. Policy checks
  for (const [name, m] of Object.entries(models)) {
    const def = m as any
    const policies = def.policies || {}
    for (const [action, policy] of Object.entries(policies)) {
      if (policy === "*" && action === "update" && !def.auth && !def.ownerField) {
        checks.push({ ok: false, msg: `${name}.${action} is public ("*") with no auth — verify this is intended` })
      }
    }
    // Semantic: auth model should have password or email field
    if (name === config.auth?.model && def.auth === "password") {
      const fields = def.fields || {}
      const hasPassword = Object.keys(fields).some(k => String(fields[k]).includes("password"))
      const hasEmail = Object.keys(fields).some(k => String(fields[k]).includes("email") || k === "email")
      if (!hasPassword) checks.push({ ok: false, msg: `Auth model "${name}" has no password field` })
      if (!hasEmail) checks.push({ ok: false, msg: `Auth model "${name}" has no email field` })
    }
    // Semantic: check for missing required fields on public create
    if (policies.create === "*") {
      const requiredFields = Object.entries(def.fields || {}).filter(([_, v]) => String(v).includes("required")).map(([k]) => k)
      if (requiredFields.length > 5) {
        checks.push({ ok: false, msg: `${name}.create is public but has ${requiredFields.length} required fields — may cause validation errors for anonymous users` })
      }
    }
    // Semantic: scoped model without organization
    if (def.scoped && !config.auth?.organization?.enabled) {
      checks.push({ ok: false, msg: `${name} is scoped but organization is not enabled in auth` })
    }
    // Semantic: soft delete without timestamps
    if (def.softDelete && !def.timestamps) {
      checks.push({ ok: false, msg: `${name} has softDelete but no timestamps — add timestamps: true` })
    }
  }

  // 9. Semantic: auth configured but no JWT_SECRET
  if (config.auth && !process.env.JWT_SECRET) {
    checks.push({ ok: false, msg: "JWT_SECRET not set — using dev default, not safe for production" })
  }

  // 10. Semantic: public routes without rate limiting
  const hasPublicCreate = Object.entries(models).some(([_, m]) => (m as any).policies?.create === "*")
  if (hasPublicCreate) {
    checks.push({ ok: false, msg: "Some models have public create — consider rate limiting for production" })
  }

  // 11. Semantic: plugin references
  const plugins = config.plugins || []
  for (const p of plugins) {
    const localPath = join(rootDir, "plugins", `${p}.ts`)
    const npmPath = join(rootDir, "node_modules", p.startsWith("kai-plugin-") ? p : `kai-plugin-${p}`)
    if (!existsSync(localPath) && !existsSync(npmPath)) {
      checks.push({ ok: false, msg: `Plugin "${p}" not found at plugins/${p}.ts or node_modules/kai-plugin-${p}` })
    }
  }

  // 12. Semantic: email configured but no provider handling
  if (config.email?.provider === "sandbox" || config.email?.provider === "fake") {
    checks.push({ ok: true, msg: "Email: fake provider — no real emails sent" })
  }

  // 13. Strict mode checks
  const strict = config.zorux?.strict === true
  if (strict) {
    checks.push({ ok: true, msg: "Strict mode enabled — additional quality gates active" })

    // Package allowlist
    const allowlist = config.packages?.allowed || []
    if (allowlist.length > 0) {
      const pkg = existsSync(join(rootDir, "package.json")) ? JSON.parse(readFileSync(join(rootDir, "package.json"), "utf-8")) : {}
      const deps = { ...pkg.dependencies } || {}
      for (const dep of Object.keys(deps)) {
        if (!allowlist.includes(dep) && !dep.startsWith("zorux") && !["hono"].includes(dep)) {
          checks.push({ ok: false, msg: `Package "${dep}" not in allowlist — add to packages.allowed in app.yaml` })
        }
      }
    }

    // Public routes must have security
    for (const [name, m] of Object.entries(models)) {
      const def = m as any
      if (def.policies?.create === "*" || def.policies?.list === "*") {
        checks.push({ ok: false, msg: `Strict: ${name} has public "${def.policies.create === "*" ? "create" : "list"}" — rate limit or security required` })
      }
    }

    // Actions should have error handling
    const actionsDir = join(rootDir, "actions")
    if (existsSync(actionsDir)) {
      for (const f of readdirSync(actionsDir).filter((f: string) => f.endsWith(".ts"))) {
        const content = readFileSync(join(actionsDir, f), "utf-8")
        if (content.includes("catch {}")) {
          checks.push({ ok: false, msg: `Strict: actions/${f} has empty catch block` })
        }
        if (content.includes("any") && (content.match(/\bany\b/g) || []).length > 10) {
          checks.push({ ok: false, msg: `Strict: actions/${f} uses "any" excessively` })
        }
      }
    }
  }

  // Print results
  let passed = 0
  let failed = 0
  for (const c of checks) {
    if (c.ok) {
      console.log(`  ✅ ${c.msg}`)
      passed++
    } else {
      console.log(`  ⚠️  ${c.msg}`)
      failed++
    }
  }

  console.log(`\n  📊 ${passed} checks passed, ${failed} warnings`)
  if (failed > 0) {
    console.log("  ℹ️  Warnings are informational — review before production\n")
  } else {
    console.log("  ✅ Project looks good!\n")
  }
}
