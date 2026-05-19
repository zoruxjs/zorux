import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import type { DatabaseAdapter } from "./db"

export interface MigrationFile {
  name: string
  timestamp: string
  path: string
  ext: string
}

export interface MigrationRecord {
  id: number
  name: string
  batch: number
  executed_at: string
}

// ── Helpers ──

function ensureMigrationsTable(adapter: DatabaseAdapter): void {
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _migrations (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "name TEXT NOT NULL UNIQUE, " +
    "batch INTEGER NOT NULL, " +
    "executed_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
}

function ensureMigrationsDir(rootDir: string): string {
  const dir = join(rootDir, "migrations")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function listMigrationFiles(rootDir: string): MigrationFile[] {
  const dir = ensureMigrationsDir(rootDir)
  return readdirSync(dir)
    .filter(f => /^\d{14}[_\-]/.test(f) && /\.(sql|ts|js)$/.test(f))
    .map(f => ({
      name: f.replace(/\.(sql|ts|js)$/, ""),
      timestamp: f.slice(0, 14),
      path: join(dir, f),
      ext: f.split(".").pop()!,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export function getExecutedMigrations(adapter: DatabaseAdapter): Map<string, MigrationRecord> {
  ensureMigrationsTable(adapter)
  const rows = adapter.all?.("SELECT id, name, batch, executed_at FROM _migrations ORDER BY id") || []
  return new Map(rows.map((r: any) => [r.name, r]))
}

// ── Generate migration from model changes ──

export interface ModelDiff {
  tableName: string
  action: "create" | "drop" | "alter"
  added: string[]
  removed: string[]
  changed: { field: string; from: string; to: string }[]
}

export function diffModels(oldModels: any[], newModels: any[]): ModelDiff[] {
  const diffs: ModelDiff[] = []
  const oldMap = new Map(oldModels.map(m => [m.tableName, m]))
  const newMap = new Map(newModels.map(m => [m.tableName, m]))

  // Created tables
  for (const model of newModels) {
    if (!oldMap.has(model.tableName)) {
      diffs.push({ tableName: model.tableName, action: "create", added: [], removed: [], changed: [] })
    }
  }

  // Dropped tables
  for (const model of oldModels) {
    if (!newMap.has(model.tableName)) {
      diffs.push({ tableName: model.tableName, action: "drop", added: [], removed: [], changed: [] })
    }
  }

  // Altered tables
  for (const newModel of newModels) {
    const oldModel = oldMap.get(newModel.tableName)
    if (!oldModel) continue
    const oldFields = new Set(oldModel.fields.map((f: any) => f.name))
    const newFields = new Set(newModel.fields.map((f: any) => f.name))
    const added = newModel.fields.filter((f: any) => !oldFields.has(f.name) && !f.isRelation).map((f: any) => f.name)
    const removed = oldModel.fields.filter((f: any) => !newFields.has(f.name) && !f.isRelation).map((f: any) => f.name)
    const changed: { field: string; from: string; to: string }[] = []
    if (added.length > 0 || removed.length > 0 || changed.length > 0) {
      diffs.push({ tableName: newModel.tableName, action: "alter", added, removed, changed })
    }
  }

  return diffs
}

// ── Generate migration SQL ──

export function generateCreateTableSQL(provider: string, model: any): string {
  const cols: string[] = []
  const constraints: string[] = []
  const q = (n: string) => n
  const isUUID = model.idType === "uuid"

  if (isUUID) cols.push(q("id") + " TEXT PRIMARY KEY")
  else if (provider === "postgres") cols.push(q("id") + " SERIAL PRIMARY KEY")
  else cols.push(q("id") + " INTEGER PRIMARY KEY AUTOINCREMENT")

  for (const field of model.fields) {
    if (field.isRelation && field.relationType === "belongsTo") {
      const fkName = q(field.name + "Id")
      cols.push(fkName + " INTEGER")
      continue
    }
    let st = "TEXT"
    if (["int", "bool", "number", "boolean"].includes(field.type)) st = "INTEGER"
    if (field.type === "float") st = "REAL"
    let def = q(field.name) + " " + st
    if (field.isRequired) def += " NOT NULL"
    if (field.isUnique) def += " UNIQUE"
    cols.push(def)
  }

  if (model.hasAuth) cols.push(q("password") + " TEXT NOT NULL")
  if (model.softDelete) cols.push(q("deleted_at") + " TEXT")
  if (model.hasTimestamps) {
    cols.push(q("created_at") + " TEXT DEFAULT CURRENT_TIMESTAMP")
    cols.push(q("updated_at") + " TEXT DEFAULT CURRENT_TIMESTAMP")
  }

  return "CREATE TABLE " + q(model.tableName) + " (" + cols.concat(constraints).join(", ") + ");"
}

export function generateAddColumnSQL(provider: string, tableName: string, field: any): string {
  let st = "TEXT"
  if (["int", "bool", "number", "boolean"].includes(field.type)) st = "INTEGER"
  if (field.type === "float") st = "REAL"
  let def = "ALTER TABLE " + tableName + " ADD COLUMN " + field.name + " " + st
  if (field.isRequired) def += " NOT NULL DEFAULT " + (field.defaultValue !== undefined ? field.defaultValue : "''")
  if (field.isUnique) def += " UNIQUE"
  return def + ";"
}

export function generateDropColumnSQL(provider: string, tableName: string, fieldName: string): string {
  // SQLite doesn't support DROP COLUMN before 3.35.0
  // Use the workaround: recreate table
  return "-- DROP COLUMN not supported in this SQLite version\n-- Manually: ALTER TABLE " + tableName + " DROP COLUMN " + fieldName + ";"
}

// ── Migration file generator ──

export function generateMigrationContent(diffs: ModelDiff[], provider: string): string {
  let up = ""
  let down = ""
  for (const diff of diffs) {
    if (diff.action === "create") {
      up += `  // Create ${diff.tableName}\n`
      up += `  adapter.run(\`${generateCreateTableSQL(provider, { tableName: diff.tableName, fields: [], idType: "int", hasAuth: false, softDelete: false, hasTimestamps: true })}\`)\n`
      down += `  adapter.run("DROP TABLE IF EXISTS ${diff.tableName}")\n`
    } else if (diff.action === "drop") {
      up += `  adapter.run("DROP TABLE IF EXISTS ${diff.tableName}")\n`
      down += `  // Recreate ${diff.tableName} — add CREATE TABLE here\n`
    }
  }
  return `import type { DatabaseAdapter } from "../src/core/db"

export async function up(adapter: DatabaseAdapter): Promise<void> {
${up}
}

export async function down(adapter: DatabaseAdapter): Promise<void> {
${down}
}
`
}

// ── Create migration file ──

export function createMigrationFile(rootDir: string, name: string, content: string): string {
  const dir = ensureMigrationsDir(rootDir)
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)
  const fileName = ts + "-" + name.replace(/\s+/g, "_") + ".ts"
  const filePath = join(dir, fileName)
  writeFileSync(filePath, content)
  return fileName
}

// ── Auto-migrate from app.yaml ──

export function autoDetectModels(rootDir: string): any[] {
  const yamlPath = join(rootDir, "app.yaml")
  if (!existsSync(yamlPath)) return []
  const raw = readFileSync(yamlPath, "utf-8")
  const config = require("js-yaml").load(raw)
  const { compileModels } = require("./compiler")
  return compileModels(config.models || {}, config.auth?.model)
}

export async function autoMigrate(rootDir: string, adapter: DatabaseAdapter): Promise<void> {
  ensureMigrationsTable(adapter)
  const executed = getExecutedMigrations(adapter)
  const files = listMigrationFiles(rootDir)

  const batch = ((adapter.get?.("SELECT COALESCE(MAX(batch), 0) as b FROM _migrations")?.b as number) || 0) + 1
  let count = 0

  for (const file of files) {
    if (executed.has(file.name)) continue
    try {
      if (file.ext === "sql") {
        const sql = readFileSync(file.path, "utf-8")
        for (const stmt of sql.split(";").map(s => s.trim()).filter(Boolean)) {
          adapter.run(stmt)
        }
      } else if (file.ext === "ts" || file.ext === "js") {
        const mod = await import(file.path)
        if (typeof mod.up === "function") await mod.up(adapter)
      }
      adapter.run("INSERT INTO _migrations (name, batch) VALUES (?, ?)", [file.name, batch])
      count++
    } catch (err: any) {
      console.error("  ✖ Failed: " + file.name + " — " + err.message)
      throw err
    }
  }

  if (count > 0) console.log("  Migrated " + count + " file(s)")
}

export async function rollbackBatch(rootDir: string, adapter: DatabaseAdapter): Promise<number> {
  ensureMigrationsTable(adapter)
  const lastBatch = adapter.get?.("SELECT MAX(batch) as b FROM _migrations")?.b as number
  if (!lastBatch) return 0

  const migrations = adapter.all?.("SELECT * FROM _migrations WHERE batch = ? ORDER BY id DESC", [lastBatch]) || []
  let count = 0
  for (const m of migrations) {
    const dir = ensureMigrationsDir(rootDir)
    const files = readdirSync(dir).filter(f => f.startsWith(m.name) || f.replace(/\.(sql|ts|js)$/, "") === m.name)
    for (const file of files) {
      const ext = file.split(".").pop()
      if (ext === "ts" || ext === "js") {
        try {
          const mod = await import(join(dir, file))
          if (typeof mod.down === "function") await mod.down(adapter)
        } catch {}
      }
    }
    adapter.run("DELETE FROM _migrations WHERE id = ?", [m.id])
    count++
  }
  return count
}
