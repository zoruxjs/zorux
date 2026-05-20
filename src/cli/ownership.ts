import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function ownershipCommand(args: string[]) {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)

  const target = args[1]
  if (!target) {
    // Show all ownership
    console.log(`\n  🏷️  ${config.name || "Zorux App"} — Ownership Map\n`)
    console.log("  Run with a specific target:")
    console.log("    zorux ownership <model>")
    console.log("    zorux ownership <route-path>")
    console.log("    zorux ownership <field>")
    console.log()
    return
  }

  // Model ownership
  if (models[target]) {
    const m = models[target]
    const fields = Object.keys(m.fields || {})
    const authRef = config.auth?.model === target
    const refs = modelNames.filter(n => {
      const fm = models[n]?.fields || {}
      return Object.values(fm).some((v: any) => typeof v === "string" && v === target)
    })
    const scopedBy = Object.entries(m.fields || {}).find(([_, v]) => v === "Organization" || (v as any)?.includes("Organization"))

    console.log(`\n  📖 ${target}\n`)

    console.log("  Declared in: app.yaml\n")

    console.log("  Used by:")
    if (authRef) console.log(`    🔐 Auth — login, register, session management`)
    console.log(`    📡 API — GET/POST/PUT/DELETE /api/${(m.plural || target.toLowerCase() + "s").replace(/ss$/, "s")}`)
    console.log(`    📊 Admin — /admin/${(m.plural || target.toLowerCase() + "s").replace(/ss$/, "s")}`)
    if (refs.length > 0) console.log(`    🔗 Referenced by: ${refs.join(", ")}`)
    if (scopedBy) console.log(`    🏢 Scoped by: ${scopedBy[1]}`)

    console.log("\n  Fields:")
    for (const f of fields) {
      const val = m.fields[f]
      const usedBy: string[] = []
      if (val.unique || String(val).includes("unique")) usedBy.push("unique index")
      if (val.required || String(val).includes("required")) usedBy.push("validation")
      if (val.auth || String(val).includes("password")) usedBy.push("auth")
      if (usedBy.length === 0) usedBy.push("storage only")
      console.log(`    ${f}: ${val}`)
      console.log(`      → ${usedBy.join(", ")}`)
    }

    console.log("\n  Policies:")
    const policies = m.policies || {}
    if (Object.keys(policies).length > 0) {
      for (const [action, policy] of Object.entries(policies)) {
        const desc = policy === "*" ? "public" : policy === "authenticated" ? "authenticated users" : policy === "owner" ? "record owner" : `role: ${policy}`
        console.log(`    ${action}: ${policy} — ${desc}`)
      }
    } else {
      console.log("    (none — default: admin)")
    }

    console.log()
    return
  }

  // Route ownership
  if (target.startsWith("/")) {
    const pluralMap: Record<string, string> = {}
    for (const name of modelNames) {
      const m = models[name]
      pluralMap[(m.plural || name.toLowerCase() + "s").replace(/ss$/, "s")] = name
    }

    let owner = ""
    if (target === "/" || target.startsWith("/admin")) owner = "core:admin"
    else if (target.startsWith("/api/auth")) owner = "core:auth"
    else if (target.startsWith("/api/health")) owner = "core:health"
    else if (target.startsWith("/api/graphql")) owner = "core:graphql"
    else if (target.startsWith("/api/openapi") || target.startsWith("/api/docs")) owner = "core:openapi"
    else if (target.startsWith("/login") || target.startsWith("/register")) owner = "core:admin"
    else {
      const parts = target.split("/")
      for (let i = 0; i < parts.length; i++) {
        const key = parts.slice(1, i + 2).join("/")
        if (pluralMap[key]) { owner = `core:crud(${pluralMap[key]})`; break }
      }
    }

    if (owner) {
      console.log(`\n  🗺️  ${target}\n`)
      console.log(`  Owner: ${owner}`)
      console.log(`  Declared in: ${owner.startsWith("core") ? "Zorux framework (app.yaml derived)" : "app.yaml"}`)
      console.log(`  Generated: true`)
      console.log(`  Editable: false (change app.yaml to modify)`)

      // Show model details if CRUD route
      const modelMatch = owner.match(/crud\((\w+)\)/)
      if (modelMatch) {
        const modelName = modelMatch[1]
        const m = models[modelName]
        if (m) {
          console.log(`\n  Model: ${modelName}`)
          console.log(`  Fields: ${Object.keys(m.fields || {}).join(", ")}`)
          const policies = m.policies || {}
          if (Object.keys(policies).length > 0) {
            console.log("  Policies:")
            for (const [action, policy] of Object.entries(policies)) {
              console.log(`    ${action}: ${policy}`)
            }
          }
        }
      }
    } else {
      console.log(`\n  🗺️  ${target}`)
      console.log("  Owner: unknown (custom route or plugin)")
    }
    console.log()
    return
  }

  // Field ownership
  for (const [mname, m] of Object.entries(models)) {
    const def = m as any
    if (def.fields?.[target]) {
      console.log(`\n  📖 ${target}\n`)
      console.log(`  Model: ${mname}`)
      console.log(`  Type: ${def.fields[target]}`)
      console.log(`  Declared in: app.yaml → ${mname}.fields.${target}`)
      console.log()
      return
    }
  }

  console.log(`\n  ❌ Target "${target}" not found in models, routes, or fields\n`)
}
