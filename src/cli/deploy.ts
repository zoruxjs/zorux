import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs"
import { join } from "path"

const dockerfileContent = `FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
`

const dockerignoreContent = `node_modules
.git
.env
.env.local
*.db
public/uploads
mobile
`

const entryPointContent = `import { createApp } from "Zorux"

const port = parseInt(process.env.PORT || "3000", 10)
const app = await createApp(process.cwd())
app.start(port)
`

const vercelJsonContent = JSON.stringify({
  buildCommand: null,
  outputDirectory: ".",
  installCommand: "bun install",
  devCommand: "bun run fw dev",
  framework: null,
  rewrites: [{ source: "/(.*)", destination: "/" }],
  functions: { "api/**/*.ts": { runtime: "@vercel/bun@latest" } },
}, null, 2)

const netlifyTomlContent = `[build]
  command = "bun run src/index.ts"
  publish = "."
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/server"
  status = 200
`

const netlifyFunctionContent = `import { createApp } from "Zorux"

const app = await createApp(process.cwd())

export default async (req: Request) => {
  return app.fetch(req)
}
`

const wranglerTomlContent = `name = "Zorux-app"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]
main = "src/worker.ts"

[env.production]
vars = { NODE_ENV = "production" }
`

const workerEntryContent = `import { createApp } from "Zorux"

const app = await createApp(process.cwd())

export default {
  async fetch(req: Request): Promise<Response> {
    return app.fetch(req)
  },
}
`

function writeIfNotExists(path: string, content: string, label: string) {
  if (!existsSync(path)) {
    writeFileSync(path, content)
    console.log("  - Created " + label)
  } else {
    console.log("  - " + label + " already exists, skipping")
  }
}

function ensureStartScript(pkg: any, rootDir: string) {
  if (!pkg.scripts?.start) {
    pkg.scripts = { ...pkg.scripts, start: "bun run src/index.ts" }
    writeFileSync(join(rootDir, "package.json"), JSON.stringify(pkg, null, 2))
    console.log("  - Added start script to package.json")
  }
}

function generateAll(rootDir: string, pkg: any) {
  const srcDir = join(rootDir, "src")
  if (!existsSync(srcDir)) mkdirSync(srcDir, { recursive: true })

  ensureStartScript(pkg, rootDir)

  // Standard entry point
  writeIfNotExists(join(srcDir, "index.ts"), entryPointContent, "src/index.ts (production entry point)")
  writeIfNotExists(join(rootDir, "Dockerfile"), dockerfileContent, "Dockerfile")
  writeIfNotExists(join(rootDir, ".dockerignore"), dockerignoreContent, ".dockerignore")

  // Vercel
  writeIfNotExists(join(rootDir, "vercel.json"), vercelJsonContent, "vercel.json")

  // Netlify
  writeIfNotExists(join(rootDir, "netlify.toml"), netlifyTomlContent, "netlify.toml")
  const netlifyDir = join(rootDir, "netlify", "functions")
  if (!existsSync(netlifyDir)) mkdirSync(netlifyDir, { recursive: true })
  writeIfNotExists(join(netlifyDir, "server.ts"), netlifyFunctionContent, "netlify/functions/server.ts")

  // Cloudflare
  writeIfNotExists(join(rootDir, "wrangler.toml"), wranglerTomlContent, "wrangler.toml (Cloudflare)")
  writeIfNotExists(join(srcDir, "worker.ts"), workerEntryContent, "src/worker.ts (Cloudflare Worker)")
}

export function deployCommand(args: string[]) {
  const rootDir = process.cwd()

  if (!existsSync(join(rootDir, "app.yaml"))) {
    console.error("[Zorux] No app.yaml found. Run this from your Zorux project root.")
    process.exit(1)
  }
  if (!existsSync(join(rootDir, "package.json"))) {
    console.error("[Zorux] No package.json found. Run 'fw new' first.")
    process.exit(1)
  }

  console.log("\n  \u26a1 Preparing deployment...\n")

  const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf-8"))
  if (!pkg.dependencies?.Zorux) {
    pkg.dependencies = { ...pkg.dependencies, Zorux: "^0.1.0" }
    writeFileSync(join(rootDir, "package.json"), JSON.stringify(pkg, null, 2))
    console.log("  - Added Zorux dependency to package.json")
  }

  const targetVercel = args.includes("--vercel")
  const targetNetlify = args.includes("--netlify") || args.includes("--netlify")
  const targetCF = args.includes("--cf") || args.includes("--cloudflare")
  const generateAllFlag = !targetVercel && !targetNetlify && !targetCF

  if (generateAllFlag || targetVercel) generateAll(rootDir, pkg)
  if (targetVercel) ensureStartScript(pkg, rootDir)

  if (targetNetlify) {
    ensureStartScript(pkg, rootDir)
    const srcDir = join(rootDir, "src")
    if (!existsSync(srcDir)) mkdirSync(srcDir, { recursive: true })
    writeIfNotExists(join(rootDir, "netlify.toml"), netlifyTomlContent, "netlify.toml")
    const netlifyDir = join(rootDir, "netlify", "functions")
    if (!existsSync(netlifyDir)) mkdirSync(netlifyDir, { recursive: true })
    writeIfNotExists(join(netlifyDir, "server.ts"), netlifyFunctionContent, "netlify/functions/server.ts")
  }

  if (targetCF) {
    ensureStartScript(pkg, rootDir)
    const srcDir = join(rootDir, "src")
    if (!existsSync(srcDir)) mkdirSync(srcDir, { recursive: true })
    writeIfNotExists(join(rootDir, "wrangler.toml"), wranglerTomlContent, "wrangler.toml (Cloudflare)")
    writeIfNotExists(join(srcDir, "worker.ts"), workerEntryContent, "src/worker.ts (Cloudflare Worker)")
  }

  console.log("\n  \u2705 Deployment files generated!")
  console.log("")
  console.log("    Docker / VPS:")
  console.log("      docker build -t my-app .")
  console.log("      docker run -p 3000:3000 my-app")
  console.log("")
  console.log("    Fly.io:")
  console.log("      fly launch")
  console.log("      fly deploy")
  console.log("")
  console.log("    Railway:")
  console.log("      railway init")
  console.log("      railway up")
  console.log("")
  console.log("    Vercel:")
  console.log("      vercel deploy")
  console.log("")
  console.log("    Netlify:")
  console.log("      netlify deploy")
  console.log("")
  console.log("    Cloudflare Workers:")
  console.log("      npm install -g wrangler")
  console.log("      wrangler deploy")
  console.log("")
  console.log("    Environment variables to set:")
  console.log("      PORT=3000")
  console.log("      JWT_SECRET=<your-secret>")
  console.log("      DATABASE_URL=<your-database-url>")
  console.log("")
}
