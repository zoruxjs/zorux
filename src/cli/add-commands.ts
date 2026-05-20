import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "fs"
import { join } from "path"
import { load, dump } from "js-yaml"

export async function addFieldCommand(args: string[]) {
  if (args.length < 3) {
    console.log("Usage: zorux add field <model> <field>:<type> [flags...]")
    console.log("Example: zorux add field Post summary:text required")
    process.exit(1)
  }

  const rootDir = process.cwd()
  const [modelName, fieldDef, ...flags] = args.slice(2)
  const [fieldName, fieldType] = fieldDef.split(":")
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) { console.error("No app.yaml found"); process.exit(1) }

  const config: any = load(readFileSync(appYamlPath, "utf-8"))
  if (!config.models?.[modelName]) { console.error(`Model "${modelName}" not found`); process.exit(1) }

  let fieldStr = fieldType || "string"
  if (flags.includes("required")) fieldStr += " required"
  if (flags.includes("unique")) fieldStr += " unique"
  const maxIdx = flags.indexOf("max:")
  if (maxIdx >= 0 && maxIdx + 1 < flags.length) fieldStr += ` max:${flags[maxIdx + 1]}`
  if (flags.includes("email")) fieldStr = `email unique`

  config.models[modelName].fields[fieldName] = fieldStr
  writeFileSync(appYamlPath, dump(config, { indent: 2, lineWidth: 120, quotingType: "'" }), "utf-8")
  console.log(`\n  ✅ Added ${modelName}.${fieldName}: ${fieldStr}`)
  console.log("  Run zorux db migrate to update the database\n")
}

export async function addPageCommand(args: string[]) {
  const pageName = args[2]
  if (!pageName) { console.log("Usage: zorux add page <name>"); process.exit(1) }

  const rootDir = process.cwd()
  const pagesDir = join(rootDir, "web", "pages")
  mkdirSync(pagesDir, { recursive: true })

  const filePath = join(pagesDir, pageName.toLowerCase().replace(/\s+/g, "-") + ".tsx")
  if (existsSync(filePath)) { console.error(`Page already exists at web/pages/${pageName}.tsx`); process.exit(1) }

  writeFileSync(filePath, `import type { FC } from "hono/jsx"

interface ${pageName.replace(/^[a-z]/, c => c.toUpperCase())}PageProps {
  appName?: string
}

export const ${pageName.replace(/^[a-z]/, c => c.toUpperCase())}Page: FC<${pageName.replace(/^[a-z]/, c => c.toUpperCase())}PageProps> = ({ appName }) => (
  <div class="min-h-screen bg-base-200">
    <nav class="navbar bg-base-100/80 backdrop-blur border-b border-base-200 sticky top-0 z-20 px-6">
      <div class="flex-1 font-bold text-lg tracking-tight">{appName || "Zorux"}</div>
    </nav>
    <main class="max-w-4xl mx-auto p-6">
      <h1 class="text-3xl font-bold tracking-tight mt-8">${pageName}</h1>
      <p class="text-lg opacity-60 mt-2">This page was generated with \`zorux add page ${pageName}\`.</p>
    </main>
  </div>
)
`, "utf-8")

  console.log(`\n  ✅ Page created at web/pages/${pageName}.tsx`)
  console.log(`  Route: GET /${pageName.toLowerCase()}\n`)
}

export async function addPackageCommand(args: string[]) {
  const pkgName = args[2]
  if (!pkgName) { console.log("Usage: zorux add package <npm-package>"); process.exit(1) }

  const rootDir = process.cwd()

  // Check built-in providers
  const knownPackages: Record<string, { section: string; key: string; value: string }> = {
    stripe: { section: "payments", key: "provider", value: "stripe" },
    "@stripe/stripe-js": { section: "payments", key: "provider", value: "stripe" },
    resend: { section: "email", key: "provider", value: "resend" },
    "@sendgrid/mail": { section: "email", key: "provider", value: "sendgrid" },
    nodemailer: { section: "email", key: "provider", value: "smtp" },
    ioredis: { section: "cache", key: "provider", value: "redis" },
    "@aws-sdk/client-s3": { section: "storage", key: "provider", value: "s3" },
    "mongodb": { section: "database", key: "provider", value: "mongodb" },
    "pg": { section: "database", key: "provider", value: "postgres" },
    "mysql2": { section: "database", key: "provider", value: "mysql" },
    "meilisearch": { section: "search", key: "provider", value: "meilisearch" },
  }

  const appYamlPath = join(rootDir, "app.yaml")
  if (existsSync(appYamlPath)) {
    const config: any = load(readFileSync(appYamlPath, "utf-8"))
    const known = knownPackages[pkgName]
    if (known && config) {
      if (!config[known.section]) config[known.section] = {}
      config[known.section][known.key] = known.value
      writeFileSync(appYamlPath, dump(config, { indent: 2, lineWidth: 120 }), "utf-8")
      console.log(`\n  ✅ Registered ${pkgName} as ${known.section}.${known.key} in app.yaml`)
    } else {
      console.log(`\n  ℹ️  ${pkgName} is not a known Zorux provider. Installing as regular npm package.\n`)
    }
  }

  // Run npm install
  const { execSync } = await import("child_process")
  execSync(`npm install ${pkgName}`, { cwd: rootDir, stdio: "inherit" })
  console.log(`  ✅ Installed ${pkgName}\n`)
}

export async function addPluginCommand(args: string[]) {
  const pluginName = args[2]
  if (!pluginName) { console.log("Usage: zorux add plugin <name>"); process.exit(1) }

  const rootDir = process.cwd()
  const pluginsDir = join(rootDir, "plugins")
  mkdirSync(pluginsDir, { recursive: true })

  const filePath = join(pluginsDir, `${pluginName}.ts`)
  if (existsSync(filePath)) { console.error(`Plugin already exists at plugins/${pluginName}.ts`); process.exit(1) }

  writeFileSync(filePath, `import { Hono } from "hono"

export default {
  name: "${pluginName}",
  version: "1.0.0",
  description: "Custom plugin",
  onRoutes(app: Hono) {
    // Register your routes here
    // app.get("/custom", (c) => c.text("Hello from ${pluginName}!"))
  },
}
`, "utf-8")

  // Add to app.yaml plugins list
  const appYamlPath = join(rootDir, "app.yaml")
  if (existsSync(appYamlPath)) {
    const config: any = load(readFileSync(appYamlPath, "utf-8"))
    if (!config.plugins) config.plugins = []
    if (!config.plugins.includes(pluginName)) {
      config.plugins.push(pluginName)
      writeFileSync(appYamlPath, dump(config, { indent: 2, lineWidth: 120 }), "utf-8")
      console.log(`  ✅ Registered plugin in app.yaml`)
    }
  }

  console.log(`\n  ✅ Plugin created at plugins/${pluginName}.ts\n`)
}
