import { mkdirSync, writeFileSync } from "fs"
import { join, dirname } from "path"

const PORT = 5199
const OUT = join(import.meta.dir, "../dist")
const BASE = `http://localhost:${PORT}`
const ROOT = join(import.meta.dir, "..")
const KAI = join(ROOT, "..")
const PAGES_BASE = process.env.PAGES_BASE || ""  // e.g. "/zorux"

const ROUTES: Record<string, string> = {
  "/": "index.html",
  "/features": "features/index.html",
  "/install": "install/index.html",
  "/docs": "docs/index.html",
  "/docs/getting-started": "docs/getting-started/index.html",
  "/docs/yaml": "docs/yaml/index.html",
  "/docs/api": "docs/api/index.html",
  "/docs/auth": "docs/auth/index.html",
  "/docs/admin": "docs/admin/index.html",
  "/docs/cli": "docs/cli/index.html",
  "/docs/database": "docs/database/index.html",
  "/docs/cache": "docs/cache/index.html",
  "/docs/storage": "docs/storage/index.html",
  "/docs/email": "docs/email/index.html",
  "/docs/jobs": "docs/jobs/index.html",
  "/docs/payments": "docs/payments/index.html",
  "/docs/realtime": "docs/realtime/index.html",
  "/docs/webhooks": "docs/webhooks/index.html",
  "/docs/graphql": "docs/graphql/index.html",
  "/docs/mobile": "docs/mobile/index.html",
  "/docs/desktop": "docs/desktop/index.html",
  "/docs/pwa": "docs/pwa/index.html",
  "/docs/plugins": "docs/plugins/index.html",
  "/docs/security": "docs/security/index.html",
  "/docs/i18n": "docs/i18n/index.html",
  "/docs/telemetry": "docs/telemetry/index.html",
  "/docs/deploy": "docs/deploy/index.html",
  "/docs/architecture": "docs/architecture/index.html",
}

const REDIRECTS: Record<string, string> = {
  "/quickstart": "/install",
  "/yaml": "/docs/yaml",
  "/api": "/docs/api",
  "/auth": "/docs/auth",
  "/abac": "/docs/security",
}

function save(path: string, html: string) {
  const full = join(OUT, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, html, "utf-8")
  console.log(`  ${path}`)
}

function redirectHtml(url: string): string {
  const u = PAGES_BASE + url
  return `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${u}"><link rel="canonical" href="${u}"></head><body><script>location.href="${u}"</script></body></html>`
}

function fixHtml(html: string): string {
  if (!PAGES_BASE) return html
  // Inject <base> tag after <title>
  html = html.replace("</title>", `</title><base href="${PAGES_BASE}/">`)
  // Fix internal absolute links
  html = html.replace(/(href|src|action)=(["'])\//g, `$1=$2${PAGES_BASE}/`)
  return html
}

async function main() {
  console.log("[build] Starting Zorux server...")

  const { createApp } = await import(join(KAI, "src/core/app.ts"))
  const app = await createApp(ROOT)
  app.start(PORT)

  await new Promise(r => setTimeout(r, 2000))

  try {
    for (const [route, file] of Object.entries(ROUTES)) {
      const res = await fetch(`${BASE}${route}`)
      let html = await res.text()
      html = fixHtml(html)
      save(file, html)
    }

    for (const [from, to] of Object.entries(REDIRECTS)) {
      const file = from === "/" ? "index.html" : `${from.slice(1)}/index.html`
      save(file, redirectHtml(to))
    }

    console.log(`\n[build] Done! ${Object.keys(ROUTES).length + Object.keys(REDIRECTS).length} pages written to ${OUT}`)
  } finally {
    const srv = (app as any)._server
    if (srv?.stop) srv.stop()
    else if (srv?.close) srv.close()
    process.exit(0)
  }
}

main()
