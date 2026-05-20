import { existsSync, watch, readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"
import type { AppInstance } from "../core/app"

let currentApp: AppInstance | null = null
let restartTimer: ReturnType<typeof setTimeout> | null = null
let watchers: ReturnType<typeof watch>[] = []
let liveReloadClients: Set<(msg: string) => void> = new Set()

function clearWatchers() {
  for (const w of watchers) { try { w.close() } catch {} }
  watchers = []
}

// ═══ Live Reload via EventSource ═══
function injectLiveReload(handler: (c: any) => any) {
  return async (c: any) => {
    const res = await handler(c)
    if (res instanceof Response && res.headers.get("content-type")?.includes("text/html")) {
      const text = await res.text()
      const script = `<script>
(function(){
  var es = new EventSource("/__zorux_livereload")
  es.addEventListener("reload", function(){ location.reload() })
  es.addEventListener("css", function(e){ 
    var links = document.querySelectorAll("link[rel=stylesheet]")
    links.forEach(function(l){ l.href = l.href.split("?")[0] + "?t=" + Date.now() })
  })
})()
</script>`
      const body = text.includes("</body>") 
        ? text.replace("</body>", script + "</body>")
        : text + script
      return new Response(body, {
        status: (res as any).status || 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }
    return res
  }
}

function setupLiveReload(app: any) {
  // Wrap the Hono app's fetch (app._app is the Hono instance)
  const hono = app._app || app
  const originalFetch = hono.fetch.bind(hono)
  hono.fetch = async (req: Request) => {
    const url = new URL(req.url)

    // Handle EventSource endpoint
    if (url.pathname === "/__zorux_livereload") {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("event: connected\ndata: ok\n\n"))
          const send = (msg: string) => {
            try { controller.enqueue(new TextEncoder().encode(msg)) } catch {}
          }
          liveReloadClients.add(send)
          const keepalive = setInterval(() => {
            try { controller.enqueue(new TextEncoder().encode(": keepalive\n\n")) } catch { clearInterval(keepalive) }
          }, 15000)
        },
      })
      return new Response(body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })
    }

    const res = await originalFetch(req)

    // Inject live reload script into HTML responses
    if (res instanceof Response && res.headers.get("content-type")?.includes("text/html")) {
      const text = await res.text()
      const script = `<script>
(function(){
  var es = new EventSource("/__zorux_livereload")
  es.addEventListener("reload", function(){ location.reload() })
  es.addEventListener("css", function(e){ 
    var links = document.querySelectorAll("link[rel=stylesheet]")
    links.forEach(function(l){ l.href = l.href.split("?")[0] + "?t=" + Date.now() })
  })
})()
</script>`
      const body = text.includes("</body>")
        ? text.replace("</body>", script + "</body>")
        : text + script
      return new Response(body, {
        status: (res as any).status || 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }

    return res
  }
}

function notifyReload(type: "reload" | "css") {
  const msg = `event: ${type}\ndata: ${Date.now()}\n\n`
  for (const send of liveReloadClients) {
    try { send(msg) } catch {}
  }
}

// ═══ Watcher ═══
function createWatcher(rootDir: string, port: number) {
  clearWatchers()

  const watchedDirs = [
    rootDir,
    join(rootDir, "actions"),
    join(rootDir, "jobs"),
    join(rootDir, "plugins"),
    join(rootDir, "locales"),
    join(rootDir, "views"),
    join(rootDir, "web"),
  ].filter(d => existsSync(d))

  for (const dir of watchedDirs) {
    try {
      const w = watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename) return
        const p = typeof filename === "string" ? filename : filename.toString()
        if (!/\.(yaml|yml|ts|js|tsx|jsx|json|css)$/i.test(p)) return
        if (p.includes("node_modules") || p.includes("/dist/") || p.includes("\\dist\\")) return

        // CSS-only: hot reload without full restart
        if (/\.css$/i.test(p) && !p.includes("admin.css")) {
          notifyReload("css")
          return
        }

        scheduleRestart(rootDir, port, p)
      })
      watchers.push(w)
    } catch {}
  }

  // Polling fallback for platforms where fs.watch is unreliable
  startPollingFallback(rootDir, port)
}

function startPollingFallback(rootDir: string, port: number) {
  const files = new Map<string, number>()
  setInterval(() => {
    const dirs = [rootDir, join(rootDir, "actions"), join(rootDir, "plugins"), join(rootDir, "web")].filter(d => existsSync(d))
    for (const dir of dirs) {
      try {
        const entries = readdirSync(dir, { recursive: true }) as string[]
        for (const entry of entries) {
          if (typeof entry !== "string") continue
          if (!/\.(yaml|ts|tsx)$/i.test(entry)) continue
          if (entry.includes("node_modules") || entry.includes("dist")) continue
          const fp = join(dir, entry)
          try {
            const mtime = statSync(fp).mtimeMs
            const prev = files.get(fp)
            if (prev && mtime > prev) {
              scheduleRestart(rootDir, port, entry)
              return
            }
            files.set(fp, mtime)
          } catch {}
        }
      } catch {}
    }
  }, 2000)
}

function scheduleRestart(rootDir: string, port: number, changedPath: string) {
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = setTimeout(async () => {
    await doRestart(rootDir, port, changedPath)
  }, 300)
}

async function doRestart(rootDir: string, port: number, changedPath: string) {
  console.log(`\n  \u{1F504} Reloading: ${changedPath.split(/[/\\]/).pop()}`)
  console.log(`  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`)

  // Clear module cache
  for (const key of Object.keys(require.cache || {})) {
    if (key.includes(rootDir)) {
      try { delete require.cache[key] } catch {}
    }
  }

  try {
    const { createApp } = await import("../core/app")
    const newApp = await createApp(rootDir)

    if (currentApp) {
      try {
        const oldServer = (currentApp as any)._server
        if (oldServer?.stop) oldServer.stop()
      } catch {}
    }

    currentApp = newApp
    currentApp.start(port)

    // Notify browser to reload
    notifyReload("reload")

    createWatcher(rootDir, port)
  } catch (err: any) {
    console.error(`\n  \u274C Reload failed: ${err.message}`)
    if (err.stack) {
      console.error(`  ${err.stack.split("\n").slice(0, 3).join("\n  ") || ""}`)
    }
    console.log(`  \u23F3 Waiting for file change to retry...`)
  }
}

export async function devCommand(options: { port?: string }) {
  const port = parseInt(options.port || "3000", 10)
  const rootDir = process.cwd()

  if (!existsSync(join(rootDir, "app.yaml"))) {
    console.error("[Zorux] No app.yaml found in current directory")
    process.exit(1)
  }

  console.log(`\n  \u26A1 Zorux dev server  (port ${port})`)
  console.log(`  Source of truth: app.yaml`)
  console.log(`  For agents: run zorux context`)
  console.log(`  Live reload: enabled (EventSource)`)
  console.log(`  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`)
  console.log(`  Root: ${rootDir}`)
  console.log(`  Watching for file changes...`)

  try {
    const { createApp } = await import("../core/app")
    currentApp = await createApp(rootDir)

    // Wrap with live reload
    setupLiveReload(currentApp as any)

    currentApp.start(port)
  } catch (err: any) {
    console.error(`\n  \u274C Failed to start: ${err.message}`)
    if (err.stack) {
      console.error(`  ${err.stack.split("\n").slice(0, 3).join("\n  ") || ""}`)
    }
    process.exit(1)
  }

  createWatcher(rootDir, port)
}
