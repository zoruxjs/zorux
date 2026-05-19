import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { parseAppConfig } from "../core/yaml"
import { compileModels } from "../core/compiler"
import { createPlatform } from "../core/platform"

export async function runnerCommand(args: string[]) {
  const rootDir = process.cwd()
  const scriptName = args[1]

  if (!scriptName) {
    console.log("zorux runner <script>")
    console.log("  Runs a script in the app context.")
    console.log("  Script receives: config, models, platform, db, col")
    console.log("")
    console.log("  Example:")
    console.log('    echo \'console.log("Users:", await col("User").count())\' > scripts/stats.ts')
    console.log("zorux runner scripts/stats.ts")
    return
  }

  const scriptPath = join(rootDir, scriptName)
  if (!existsSync(scriptPath)) {
    console.error("[Zorux] Script not found: " + scriptName)
    process.exit(1)
  }

  // Load app context
  const config = parseAppConfig(rootDir)
  const models = compileModels(config.models, config.auth?.model)
  const platform = await createPlatform(config, models)

  const ctx = {
    config,
    models,
    platform,
    db: platform.database,
    col: (name: string) => {
      const model = models.find(m => m.tableName === name || m.name === name)
      return platform.database.collection(model?.tableName || name, model)
    },
  }

  try {
    const mod = await import(scriptPath)
    if (typeof mod.default === "function") {
      await mod.default(ctx)
    }
  } catch (err: any) {
    console.error("[Zorux] Script error:", err.message)
    process.exit(1)
  } finally {
    platform.database.close()
  }
}
