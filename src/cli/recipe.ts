import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"
import { load, dump } from "js-yaml"

export async function recipeCommand(args: string[]) {
  const sub = args[1]
  if (sub !== "add" || !args[2]) {
    console.log("Usage: zorux recipe add <name>")
    console.log("Available: blog, teams, billing")
    process.exit(1)
  }

  const name = args[2]
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] No app.yaml found in current directory")
    process.exit(1)
  }

  // Load recipe
  const dir2 = import.meta.dir
  const recipeDir = existsSync(join(dir2, "../../recipes"))
    ? join(dir2, "../../recipes")
    : join(dir2, "../recipes")
  const recipePath = join(recipeDir, name + ".yaml")
  if (!existsSync(recipePath)) {
    console.error("[Zorux] Recipe '" + name + "' not found in recipes/")
    process.exit(1)
  }

  const recipe = load(readFileSync(recipePath, "utf-8")) as any
  console.log("\n  📖 Applying recipe: " + recipe.name)
  console.log("  " + recipe.description + "\n")

  // Apply patch to app.yaml
  const appYaml = load(readFileSync(appYamlPath, "utf-8")) as any

  if (recipe.patch?.models) {
    if (!appYaml.models) appYaml.models = {}
    for (const [mname, mdef] of Object.entries(recipe.patch.models)) {
      if (appYaml.models[mname]) {
        console.log("  ⚠️  Model '" + mname + "' already exists, skipping")
        continue
      }
      appYaml.models[mname] = mdef
      console.log("  ✅ Added model: " + mname)
    }
  }

  if (recipe.patch?.auth) {
    appYaml.auth = { ...(appYaml.auth || {}), ...recipe.patch.auth }
    console.log("  ✅ Updated auth config")
  }

  if (recipe.patch?.email) {
    appYaml.email = { ...(appYaml.email || {}), ...recipe.patch.email }
    console.log("  ✅ Updated email config")
  }

  writeFileSync(appYamlPath, dump(appYaml, { indent: 2, lineWidth: 120, quotingType: "'" }))
  console.log("  ✅ Updated app.yaml")

  // Generate action files
  if (recipe.patch?.actions) {
    const actionsDir = join(rootDir, "actions")
    mkdirSync(actionsDir, { recursive: true })
    for (const [fname, content] of Object.entries(recipe.patch.actions)) {
      writeFileSync(join(actionsDir, fname), content as string)
      console.log("  ✅ Created action: actions/" + fname)
    }
  }

  console.log("\n  ✅ Recipe '" + name + "' applied successfully!")
  console.log("  Next: review app.yaml and run zorux dev\n")
}
