import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"
import { load, dump } from "js-yaml"

export async function applyCommand(args: string[]) {
  const changePath = args[1]
  if (!changePath) {
    console.log("Usage: zorux apply <change.yaml>")
    console.log("Example:")
    console.log(`  zorux apply - <<EOF
change:
  type: add_model
  model: Invoice
  fields:
    amount: number required
    status: string enum:draft,paid,void
EOF`)
    process.exit(1)
  }

  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")
  if (!existsSync(appYamlPath)) { console.error("No app.yaml found"); process.exit(1) }

  const changeYaml = changePath === "-" ? await readStdin() : readFileSync(changePath, "utf-8")
  const change = load(changeYaml) as any
  if (!change?.change) { console.error("Invalid change file: missing 'change:' key"); process.exit(1) }

  const config: any = load(readFileSync(appYamlPath, "utf-8"))
  const action = change.change

  console.log(`\n  📝 Applying change: ${action.type}\n`)

  switch (action.type) {
    case "add_model": {
      if (!action.model || !action.fields) {
        console.error("add_model requires: model (name) and fields")
        process.exit(1)
      }
      if (!config.models) config.models = {}
      if (config.models[action.model]) {
        console.error(`Model "${action.model}" already exists`)
        process.exit(1)
      }
      const m: any = { fields: {} }
      for (const [fname, ftype] of Object.entries(action.fields)) {
        m.fields[fname] = ftype
      }
      if (action.timestamps) m.timestamps = true
      if (action.policies) m.policies = action.policies
      config.models[action.model] = m
      console.log(`  ✅ Added model: ${action.model}`)
      if (action.admin) {
        console.log(`  📊 Admin columns: ${(action.admin.columns || []).join(", ")}`)
      }
      break
    }

    case "add_field": {
      if (!action.model || !action.field) {
        console.error("add_field requires: model, field (name:type)")
        process.exit(1)
      }
      const [fname, ftype] = action.field.split(":")
      if (!config.models?.[action.model]) {
        console.error(`Model "${action.model}" not found`)
        process.exit(1)
      }
      config.models[action.model].fields[fname] = ftype || "string"
      console.log(`  ✅ Added ${action.model}.${fname}: ${ftype || "string"}`)
      break
    }

    case "add_recipe": {
      const recipeName = action.recipe
      if (!recipeName) { console.error("add_recipe requires: recipe (name)"); process.exit(1) }
      const { execSync } = await import("child_process")
      execSync(`bun ${process.argv[1]} recipe add ${recipeName}`, { cwd: rootDir, stdio: "inherit" })
      return
    }

    case "add_action": {
      if (!action.name) { console.error("add_action requires: name"); process.exit(1) }
      const actionsDir = join(rootDir, "actions")
      mkdirSync(actionsDir, { recursive: true })
      const handlerCode = action.handler || `export const handler = async (c: any) => {
  const body = await c.req.json()
  return c.json({ success: true, data: body })
}`
      writeFileSync(join(actionsDir, `${action.name}.ts`), handlerCode, "utf-8")
      console.log(`  ✅ Created action: actions/${action.name}.ts`)
      break
    }

    case "add_page": {
      if (!action.name) { console.error("add_page requires: name"); process.exit(1) }
      const pagesDir = join(rootDir, "web", "pages")
      mkdirSync(pagesDir, { recursive: true })
      writeFileSync(join(pagesDir, `${action.name}.tsx`), `import type { FC } from "hono/jsx"

export const ${action.name.charAt(0).toUpperCase() + action.name.slice(1)}Page: FC<{ appName?: string }> = ({ appName }) => (
  <div class="min-h-screen bg-base-200 p-8">
    <h1 class="text-3xl font-bold">${action.name}</h1>
  </div>
)
`, "utf-8")
      console.log(`  ✅ Created page: web/pages/${action.name}.tsx → GET /${action.name}`)
      break
    }

    default:
      console.error(`Unknown change type: "${action.type}"`)
      console.log("Supported types: add_model, add_field, add_recipe, add_action, add_page")
      process.exit(1)
  }

  writeFileSync(appYamlPath, dump(config, { indent: 2, lineWidth: 120 }), "utf-8")
  console.log("  ✅ Updated app.yaml\n")
}

function readStdin(): Promise<string> {
  return new Promise(resolve => {
    let data = ""
    process.stdin.on("data", (chunk: Buffer) => data += chunk)
    process.stdin.on("end", () => resolve(data))
  })
}
