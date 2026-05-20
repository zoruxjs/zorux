import { readFileSync, existsSync } from "fs"
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
