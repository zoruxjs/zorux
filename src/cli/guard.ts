import { existsSync, readFileSync } from "fs"
import { join } from "path"

export async function guardInstallCommand() {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) return // not a Zorux project

  console.log(`\n  ⚠️  Zorux project detected.`)
  console.log(`  Instead of npm install <pkg>, prefer:`)
  console.log(`    zorux add package <name>`)
  console.log(`  This keeps app.yaml, providers, env vars, and manifests in sync.\n`)
}
