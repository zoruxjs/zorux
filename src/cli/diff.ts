import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function diffCommand(args: string[]) {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")
  const manifestPath = join(rootDir, ".zorux", "manifest.json")

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)
  const changes: string[] = []

  changes.push(`## YAML Changes`)
  changes.push(``)

  // Detect model changes (compare with manifest if available)
  if (existsSync(manifestPath)) {
    const prev = JSON.parse(readFileSync(manifestPath, "utf-8"))
    const prevModels = new Map(prev.models?.map((m: any) => [m.name, m]) || [])

    for (const name of modelNames) {
      const m = models[name]
      const prevM = prevModels.get(name)
      const fields = Object.keys(m.fields || {})
      const prevFields = prevM?.fields || []

      if (!prevM) {
        changes.push(`- **Added model \`${name}\`**`)
        changes.push(`  - Fields: ${fields.join(", ")}`)
        if (m.policies) {
          for (const [action, policy] of Object.entries(m.policies)) {
            changes.push(`  - Policy ${action}: ${policy}`)
          }
        }
        changes.push(`  - API routes generated: GET/POST /api/${name.toLowerCase()}s`)
        changes.push(`  - Admin CRUD available at /admin/${name.toLowerCase()}s`)
        changes.push(`  - Database migration needed: CREATE TABLE ${name.toLowerCase()}s`)
        continue
      }

      // Check for new/deleted fields
      const newFields = fields.filter(f => !prevFields.includes(f))
      const deletedFields = prevFields.filter((f: string) => !fields.includes(f))

      if (newFields.length > 0) {
        changes.push(`- **Model \`${name}\` — new fields:** ${newFields.join(", ")}`)
        changes.push(`  - Migration needed: ALTER TABLE ${name.toLowerCase()}s ADD COLUMN`)
      }
      if (deletedFields.length > 0) {
        changes.push(`- **Model \`${name}\` — removed fields:** ${deletedFields.join(", ")}`)
      }

      // Check policy changes
      const policies = m.policies || {}
      const prevPolicies = prevM?.policies || {}
      for (const [action, policy] of Object.entries(policies)) {
        if (prevPolicies[action] !== policy) {
          changes.push(`- **Model \`${name}\` — policy \`${action}\`**: \`${prevPolicies[action] || "none"}\` → \`${policy}\``)
        }
      }
    }

    // Detect deleted models
    for (const [name] of prevModels) {
      if (!models[name]) {
        changes.push(`- **Removed model \`${name}\`**`)
        changes.push(`  - Migration needed: DROP TABLE ${name.toLowerCase()}s (data loss!)`)
      }
    }
  } else {
    // No previous manifest — show full plan
    changes.push(`No previous state found (.zorux/manifest.json). Showing full plan.`)
    changes.push(``)
    changes.push(`**Models (${modelNames.length}):**`)
    for (const name of modelNames) {
      const m = models[name]
      const fields = Object.keys(m.fields || {})
      changes.push(`- \`${name}\`: ${fields.join(", ")}`)
    }
  }

  // Auth changes
  if (config.auth) {
    changes.push(``)
    changes.push(`- **Auth**: ${config.auth.model} (${config.auth.registration})`)
    if (config.auth.organization?.enabled) {
      changes.push(`  - Organizations enabled (${config.auth.organization.roles?.join(", ")})`)
    }
  }

  // Database
  changes.push(``)
  changes.push(`- **Database**: ${config.database?.provider || "sqlite"}`)

  // Plugin changes
  if (config.plugins?.length > 0) {
    changes.push(``)
    for (const p of config.plugins) {
      changes.push(`- **Plugin**: ${p} (routes, actions, views)`)
    }
  }

  // Print
  console.log(`\n  📋 Semantic Diff — ${config.name || "Zorux App"}\n`)
  for (const line of changes) {
    console.log(`  ${line}`)
  }
  console.log()
}
