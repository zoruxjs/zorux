import { readFileSync, readdirSync, existsSync } from "fs"
import { join } from "path"

const DOCS_DIR = join(import.meta.dir, "../../docs")

const DOC_MAP: Record<string, string> = {
  "getting-started": "getting-started.md",
  "yaml": "yaml.md",
  "auth": "auth.md",
  "api": "api.md",
  "admin": "admin.md",
  "email": "email.md",
  "jobs": "jobs.md",
  "cli": "cli.md",
  "database": "database.md",
  "security": "security.md",
  "deploy": "deploy.md",
  "plugins": "plugins.md",
  "storage": "storage.md",
  "mobile": "mobile.md",
  "realtime": "realtime.md",
}

export function docsCommand(args: string[]) {
  const topic = args[1]
  const term = args.slice(1).join(" ")

  if (term === "--list" || term === "list" || term === "--help" || term === "help") {
    console.log("\n  Zorux Documentation\n")
    console.log("zorux docs <topic>\n")
    console.log("  Available topics:")
    for (const [key, file] of Object.entries(DOC_MAP)) {
      const label = file.replace(".md", "").replace(/-/g, " ")
      console.log("    " + key.padEnd(20) + label)
    }
    console.log("")
    return
  }

  if (topic && existsSync(join(DOCS_DIR, DOC_MAP[topic]))) {
    const content = readFileSync(join(DOCS_DIR, DOC_MAP[topic]), "utf-8")
    console.log("\n" + "=".repeat(60))
    console.log("  " + topic.toUpperCase())
    console.log("=".repeat(60) + "\n")
    console.log(content)
    return
  }

  // Show default (getting started)
  const defaultContent = readFileSync(join(DOCS_DIR, "getting-started.md"), "utf-8")
  console.log("\n" + "=".repeat(60))
  console.log("  Zorux FRAMEWORK — GETTING STARTED")
  console.log("=".repeat(60) + "\n")
  console.log(defaultContent)
  console.log("zorux docs --list' for all topics\n")
}
