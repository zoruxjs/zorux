import { writeFileSync, existsSync, mkdirSync, readdirSync } from "fs"
import { join } from "path"

export async function makeCommand(args: string[]) {
  const type = args[1]
  const rootDir = process.cwd()

  if (!existsSync(join(rootDir, "app.yaml"))) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  switch (type) {
    case "action": {
      const name = args[2]
      const handlers = args.slice(3)
      if (!name || handlers.length === 0) {
        console.error("Usage: fw make action <name> <handler1> [handler2 ...]")
        console.error("  Example: fw make action posts publish unpublish archive")
        process.exit(1)
      }

      const actionsDir = join(rootDir, "actions")
      if (!existsSync(actionsDir)) mkdirSync(actionsDir, { recursive: true })

      const content = handlers.map((h: string) => {
        return `export const ${h} = {
  policy: "authenticated",
  handler: async (c: any) => {
    const body = await c.req.json().catch(() => ({}))
    return c.json({ success: true, action: "${h}", data: body })
  },
}
`
      }).join("\n")

      const filePath = join(actionsDir, name + ".ts")
      writeFileSync(filePath, content)
      console.log("  \u2705 Created action: " + name + " (" + handlers.join(", ") + ")")
      break
    }

    case "job": {
      const name = args[2]
      if (!name) {
        console.error("Usage: fw make job <name>")
        console.error("  Example: fw make job send-welcome-email")
        process.exit(1)
      }

      const jobsDir = join(rootDir, "jobs")
      if (!existsSync(jobsDir)) mkdirSync(jobsDir, { recursive: true })

      const content = `export default {
  name: "${name}",
  async perform(args: any, _context: any) {
    console.log("Job '${name}' executed with args:", JSON.stringify(args))
    // TODO: implement job logic
  },
}
`
      const filePath = join(jobsDir, name + ".ts")
      writeFileSync(filePath, content)
      console.log("  \u2705 Created job: " + name)
      break
    }

    case "migration": {
      const name = args.slice(2).join("_")
      if (!name) {
        console.error("Usage: fw make migration <name>")
        console.error("  Example: fw make migration add_users_table")
        process.exit(1)
      }

      const { createMigrationFile } = await import("../core/migrate").catch(() => ({ createMigrationFile: null as any }))
      const content = `import type { DatabaseAdapter } from "../src/core/db"

export async function up(adapter: DatabaseAdapter): Promise<void> {
  // UP: Add migration logic here
  // adapter.run("CREATE TABLE ...")
  // adapter.run("ALTER TABLE ... ADD COLUMN ...")
}

export async function down(adapter: DatabaseAdapter): Promise<void> {
  // DOWN: Revert the migration
  // adapter.run("DROP TABLE IF EXISTS ...")
  // adapter.run("ALTER TABLE ... DROP COLUMN ...")
}
`
      const fileName = createMigrationFile(rootDir, name, content)
      console.log("  ✅ Created migration: " + fileName)
      break
    }

    default:
      console.log("Usage:")
      console.log("  fw make action <name> <handler1> [handler2 ...]")
      console.log("  fw make job <name>")
      console.log("  fw make migration <name>")
  }
}
