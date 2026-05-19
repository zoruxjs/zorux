import { readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import { load as yamlLoad } from "js-yaml"
import { parseAppConfig } from "../core/yaml"
import { compileModels } from "../core/compiler"

export function infoCommand() {
  const rootDir = process.cwd()

  if (!existsSync(join(rootDir, "app.yaml"))) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  const config = parseAppConfig(rootDir)
  const models = compileModels(config.models, config.auth?.model)

  console.log("")
  console.log("  Project: " + config.name)
  console.log("  Type: " + config.type)
  console.log("  Provider: " + config.provider)
  console.log("")

  // Database
  console.log("  Database:")
  console.log("    Provider: " + config.database?.provider || "sqlite")
  console.log("    URL: " + (config.database?.url || ":memory:"))
  console.log("")

  // Models
  console.log("  Models (" + models.length + "):")
  for (const model of models) {
    const scoped = model.isScoped ? " [scoped]" : ""
    const idType = model.idType === "uuid" ? " [uuid]" : ""
    const fields = model.fields.filter(f => !f.isRelation).map(f => f.name).join(", ")
    console.log("    " + model.name + idType + scoped)
    console.log("      Table: " + model.tableName)
    console.log("      Fields: " + fields)
    if (model.policies && Object.keys(model.policies).length > 0) {
      console.log("      Policies: " + Object.entries(model.policies).map(([k, v]) => k + "=" + v).join(", "))
    }
  }
  console.log("")

  // Auth
  if (config.auth) {
    console.log("  Auth:")
    console.log("    Model: " + config.auth.model)
    console.log("    Registration: " + config.auth.registration)
    if (config.auth.roles) console.log("    Roles: " + config.auth.roles.join(", "))
    if (config.auth.social) {
      const providers = Object.keys(config.auth.social)
      console.log("    Social: " + providers.join(", "))
    }
    console.log("")
  }

  // Auth
  if (config.email) {
    console.log("  Email: " + (config.email as any).provider || "log")
  }

  // Cache
  if ((config as any).cache) {
    console.log("  Cache: " + (config as any).cache.provider)
  }

  // Actions
  const actionsDir = join(rootDir, "actions")
  if (existsSync(actionsDir)) {
    const actions = readdirSync(actionsDir).filter(f => f.endsWith(".ts") && f !== ".gitkeep")
    if (actions.length > 0) console.log("  Actions: " + actions.join(", "))
  }

  // Jobs
  const jobsDir = join(rootDir, "jobs")
  if (existsSync(jobsDir)) {
    const jobs = readdirSync(jobsDir).filter(f => f.endsWith(".ts"))
    if (jobs.length > 0) console.log("  Jobs: " + jobs.join(", "))
  }

  // Plugins
  if (config.plugins && config.plugins.length > 0) {
    console.log("  Plugins: " + config.plugins.join(", "))
  }

  console.log("")
}
