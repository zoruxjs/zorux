import { readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function mapCommand(args: string[]) {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] No app.yaml found")
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any

  console.log(`\n  🗺️  ${config.name || "Zorux App"} — File Map\n`)

  // EDIT THESE (authored by user)
  console.log("  📝 Edit These (user-authored):")
  console.log("    app.yaml            ← Models, auth, plugins, config")

  // Actions
  const actionsDir = join(rootDir, "actions")
  if (existsSync(actionsDir)) {
    const actions = readdirSync(actionsDir).filter(f => f.endsWith(".ts"))
    if (actions.length > 0) {
      console.log("    actions/*.ts        ← Custom API actions")
      for (const a of actions) console.log(`      ${a}`)
    }
  }

  // Web pages
  const webPagesDir = join(rootDir, "web", "pages")
  if (existsSync(webPagesDir)) {
    const pages = readdirSync(webPagesDir).filter(f => f.endsWith(".tsx"))
    if (pages.length > 0) {
      console.log("    web/pages/*.tsx     ← Public pages (auto-loaded by route)")
      for (const p of pages) console.log(`      ${p}`)
    }
  }

  // Plugins
  const pluginsDir = join(rootDir, "plugins")
  if (existsSync(pluginsDir)) {
    const plugins = readdirSync(pluginsDir).filter(f => f.endsWith(".ts"))
    if (plugins.length > 0) {
      console.log("    plugins/*.ts        ← Plugin files")
      for (const p of plugins) console.log(`      ${p}`)
    }
  }

  // Jobs
  const jobsDir = join(rootDir, "jobs")
  if (existsSync(jobsDir)) {
    const jobs = readdirSync(jobsDir).filter(f => f.endsWith(".ts"))
    if (jobs.length > 0) {
      console.log("    jobs/*.ts           ← Background job definitions")
      for (const j of jobs) console.log(`      ${j}`)
    }
  }

  // Seed
  const seedPath = join(rootDir, "seed.ts")
  if (existsSync(seedPath)) {
    console.log("    seed.ts             ← Database seed script")
  }

  console.log()

  // DON'T EDIT (generated or runtime)
  console.log("  🔒 Usually Do Not Edit (generated or derived):")

  // .zorux/
  const dotDir = join(rootDir, ".zorux")
  if (existsSync(dotDir)) {
    const files = readdirSync(dotDir).filter(f => !f.startsWith("."))
    if (files.length > 0) {
      console.log("    .zorux/             ← Generated manifests")
      for (const f of files) console.log(`      ${f}`)
    }
  }

  // node_modules
  console.log("    node_modules/       ← Installed dependencies (bun install)")
  console.log("    dist/               ← Compiled output")
  console.log("    package.json        ← Managed by zorux new / bun add")
  console.log("    .env                ← Environment variables (copy to CI)")
  console.log()

  // Summary
  const totalModels = Object.keys(config.models || {}).length
  const totalPlugins = (config.plugins || []).length
  const totalAuth = config.auth ? 1 : 0

  console.log("  📊 Summary:")
  console.log(`    ${totalModels} model(s)`)
  console.log(`    ${totalAuth ? "Auth enabled" : "No auth"}`)
  console.log(`    ${totalPlugins} plugin(s)`)
  console.log()
}
