import { join } from "path"
import { parseAppConfig } from "../core/yaml"
import { compileModels } from "../core/compiler"
import { createPlatform } from "../core/platform"

export async function consoleCommand() {
  const rootDir = process.cwd()

  // Load the app
  console.log("\n  Loading Zorux app...")

  const config = parseAppConfig(rootDir)
  const models = compileModels(config.models, config.auth?.model)
  const platform = await createPlatform(config, models)

  console.log("  App: " + config.name)
  console.log("  Models: " + models.map(m => m.name).join(", "))
  console.log("  Type: " + config.type)
  console.log("")

  // Start REPL
  const repl = require("repl")
  const server = repl.start({
    prompt: "Zorux> ",
    useColors: true,
    ignoreUndefined: true,
    breakEvalOnSigint: true,
  })

  // Make useful things available in the REPL context
  server.context.config = config
  server.context.models = models
  server.context.platform = platform
  server.context.db = platform.database

  // Helper: get a collection
  server.context.col = (name: string) => {
    const model = models.find(m => m.tableName === name || m.name === name)
    return platform.database.collection(model?.tableName || name, model)
  }

  // Helper: query helper
  server.context.query = async (sql: string, params?: any[]) => {
    const db = platform.database as any
    if (db?.all) return db.all(sql, params)
    if (db?.run) db.run(sql, params)
    return null
  }

  // Display available helpers
  console.log("  Available variables:")
  console.log("    config    - App configuration")
  console.log("    models    - Compiled models")
  console.log("    platform  - Platform adapter")
  console.log("    db        - Database interface")
  console.log("    col(name) - Get a DataCollection by model name")
  console.log("    query(sql)- Run raw SQL")
  console.log("")

  server.on("exit", () => {
    platform.database.close()
    process.exit(0)
  })
}
