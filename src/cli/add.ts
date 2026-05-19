import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"
import { load as yamlLoad, dump as yamlDump } from "js-yaml"
import { Database } from "bun:sqlite"

function sqlType(fieldType: string): string {
  if (["int", "bool"].includes(fieldType)) return "INTEGER"
  if (fieldType === "float") return "REAL"
  return "TEXT"
}

export async function addModelCommand(args: string[]) {
  const rootDir = process.cwd()
  const yamlPath = join(rootDir, "app.yaml")

  let raw: string
  try {
    raw = readFileSync(yamlPath, "utf-8")
  } catch {
    console.error("[Zorux] No app.yaml found in current directory")
    process.exit(1)
  }

  const doc: any = yamlLoad(raw)
  if (!doc.models) doc.models = {}

  const modelName = args[2]
  if (!modelName) {
    console.error("Usage: fw add model <ModelName> <field>:<type> [flags...]")
    console.error("  Example: fw add model Post title:string required body:text")
    process.exit(1)
  }

  if (doc.models[modelName]) {
    throw new Error("Model '" + modelName + "' already exists")
  }

  const fieldArgs = args.slice(3)
  if (fieldArgs.length === 0) {
    console.error("[Zorux] At least one field is required")
    process.exit(1)
  }

  const modifierPrefixes = ["min:", "max:", "default:", "pattern:", "enum:"]
  const fields: Record<string, any> = {}
  let currentField: string | null = null
  let currentDef: string[] = []

  for (const arg of fieldArgs) {
    const isModifier = modifierPrefixes.some(p => arg.startsWith(p))
    if (arg.includes(":") && !isModifier) {
      if (currentField && currentDef.length > 0) {
        fields[currentField] = currentDef.join(" ")
      }
      const [name, ...typeParts] = arg.split(":")
      currentField = name
      currentDef = [typeParts.join(":")]
    } else if (currentField) {
      currentDef.push(arg)
    }
  }
  if (currentField && currentDef.length > 0) {
    fields[currentField] = currentDef.join(" ")
  }

  doc.models[modelName] = { fields }
  const out = yamlDump(doc, { indent: 2, lineWidth: -1, noRefs: true, quotingType: "'" })
  writeFileSync(yamlPath, out)

  console.log("  Added model: " + modelName)

  // Try to create the DB table immediately
  try {
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl && !dbUrl.startsWith(":memory:")) {
      const bunDb = new Database(dbUrl)
      const cols = ["id INTEGER PRIMARY KEY AUTOINCREMENT"]
      for (const [name, defStr] of Object.entries(fields)) {
        const def = String(defStr)
        const fieldType = def.split(" ")[0]
        let col = name + " " + sqlType(fieldType)
        if (def.includes("required")) col += " NOT NULL"
        if (def.includes("unique")) col += " UNIQUE"
        cols.push(col)
      }
      const tableName = modelName.toLowerCase().replace(/([A-Z])/g, "_$1").replace(/^_/, "") + "s"
      const sql = "CREATE TABLE IF NOT EXISTS " + tableName + " (" + cols.join(", ") + ")"
      bunDb.run(sql)
      bunDb.close()
      console.log("  Table created: " + tableName)
    }
  } catch {}

  // Auto-regenerate mobile if mobile directory exists
  const mobileDir = join(rootDir, "mobile")
  if (existsSync(mobileDir)) {
    try {
      const { rmSync } = await import("fs")
      rmSync(mobileDir, { recursive: true })
      const { genMobileCommand } = await import("./gen-mobile")
      console.log("  Regenerating mobile app...")
      genMobileCommand(rootDir)
    } catch (err: any) {
      console.log("  Note: mobile regeneration failed. Run 'fw gen mobile' manually.")
    }
  }
}
