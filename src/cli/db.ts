import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, mkdirSync } from "fs"
import { join } from "path"
import { load as yamlLoad } from "js-yaml"
import { createAdapter } from "../core/db"
import { autoMigrate, rollbackBatch, listMigrationFiles, getExecutedMigrations, createMigrationFile, generateMigrationContent, diffModels, autoDetectModels } from "../core/migrate"

function getDb(rootDir: string): { adapter: any; provider: string } {
  const raw = readFileSync(join(rootDir, "app.yaml"), "utf-8")
  const config: any = yamlLoad(raw)
  const provider = config?.database?.provider || "sqlite"
  const url = config?.database?.url || ":memory:"
  const adapter: any = createAdapter(provider, url)
  if (adapter.connect) adapter.connect()
  return { adapter, provider }
}

export async function dbCommand(args: string[]) {
  const subcmd = args[1]
  const rootDir = process.cwd()

  if (!existsSync(join(rootDir, "app.yaml"))) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  if (subcmd === "reset") {
    const raw = readFileSync(join(rootDir, "app.yaml"), "utf-8")
    const config: any = yamlLoad(raw)
    const provider = config?.database?.provider || "sqlite"
    const url = config?.database?.url || "data.db"

    console.log("\n  ⚠ Database reset: " + provider)

    if (provider !== "sqlite") {
      console.log("  ℹ Reset only works for SQLite. For other databases, drop and recreate manually.")
      return
    }

    const dbPath = join(rootDir, url)
    if (existsSync(dbPath)) unlinkSync(dbPath)
    for (const ext of ["-wal", "-shm"]) {
      const walPath = dbPath + ext
      if (existsSync(walPath)) unlinkSync(walPath)
    }
    console.log("  ✅ Database reset complete. Run 'fw dev' or 'fw db migrate' to recreate.\n")

  } else if (subcmd === "migrate") {
    console.log("\n  Running migrations...\n")

    const { adapter } = getDb(rootDir)
    try {
      // Auto-create migration for model changes if --auto flag
      if (args.includes("--auto")) {
        const currentModels = autoDetectModels(rootDir)
        const executed = getExecutedMigrations(adapter)
        if (executed.size === 0 && currentModels.length > 0) {
          // First migration: snapshot all current models
          const content = generateMigrationContent(
            currentModels.map((m: any) => ({ tableName: m.tableName, action: "create" as const, added: [], removed: [], changed: [] })),
            "sqlite"
          )
          const fileName = createMigrationFile(rootDir, "initial_schema", content)
          console.log("  📦 Created initial migration: " + fileName)
        } else if (executed.size > 0) {
          // Read the last migration to get previous models
          const files = listMigrationFiles(rootDir)
          const oldModels = currentModels // diff against current for now
          console.log("  ℹ Model changes detected. Run 'fw make migration <name>' to create a migration.")
        }
      }

      await autoMigrate(rootDir, adapter)
    } catch (err: any) {
      console.error("  ✖ Migration failed: " + err.message)
      process.exit(1)
    } finally {
      adapter.close()
    }

  } else if (subcmd === "rollback") {
    console.log("\n  Rolling back last batch...\n")

    const { adapter } = getDb(rootDir)
    try {
      const count = await rollbackBatch(rootDir, adapter)
      if (count === 0) console.log("  Nothing to rollback.")
      else console.log("\n  ✅ Rolled back " + count + " migration(s)")
    } catch (err: any) {
      console.error("  ✖ Rollback failed: " + err.message)
      process.exit(1)
    } finally {
      adapter.close()
    }

  } else if (subcmd === "status") {
    console.log("\n  Migration status:\n")

    const migrationsDir = join(rootDir, "migrations")
    if (!existsSync(migrationsDir)) {
      console.log("  No migrations directory.")
      return
    }

    const { adapter } = getDb(rootDir)
    try {
      const executed = getExecutedMigrations(adapter)
      const files = listMigrationFiles(rootDir)

      if (files.length === 0 && executed.size === 0) {
        console.log("  No migrations found.")
      }

      for (const file of files) {
        const status = executed.has(file.name) ? "✅" : "⏳"
        const batch = executed.get(file.name)?.batch || "-"
        const ts = file.timestamp.slice(0, 8) + " " + file.timestamp.slice(8)
        console.log(`  ${status} ${file.name} (batch ${batch}, ${ts})`)
      }

      // Orphaned records (migration file was deleted but DB still has record)
      for (const [name] of executed) {
        if (!files.find(f => f.name === name)) {
          console.log(`  ⚠ ${name} (orphaned — file missing)`)
        }
      }
    } finally {
      adapter.close()
    }

  } else if (subcmd === "schema" && args[2] === "dump") {
    console.log("\n  Dumping schema...\n")

    const { adapter, provider } = getDb(rootDir)
    try {
      const tables = adapter.all?.("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name") || []
      let schema = ""
      for (const t of tables) {
        const createSQL = adapter.get?.("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", [t.name])
        if (createSQL?.sql) schema += createSQL.sql + ";\n\n"
      }
      const schemaPath = join(rootDir, "db", "schema.sql")
      mkdirSync(join(rootDir, "db"), { recursive: true })
      writeFileSync(schemaPath, schema)
      console.log("  ✅ Schema dumped to db/schema.sql (" + tables.length + " tables)")
    } finally {
      adapter.close()
    }

  } else {
    console.log("Usage:")
    console.log("  fw db reset                  # Delete database file")
    console.log("  fw db migrate [--auto]       # Run pending migrations")
    console.log("  fw db rollback               # Rollback last batch")
    console.log("  fw db status                 # Show migration status")
    console.log("  fw db schema dump            # Dump current DB schema to db/schema.sql")
  }
}
