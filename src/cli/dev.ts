import { existsSync, watch } from "fs"
import { join } from "path"
import type { AppInstance } from "../core/app"

let currentApp: AppInstance | null = null
let restartTimer: ReturnType<typeof setTimeout> | null = null
let watchers: ReturnType<typeof watch>[] = []

function clearWatchers() {
  for (const w of watchers) { try { w.close() } catch {} }
  watchers = []
}

function createWatcher(rootDir: string, port: number) {
  clearWatchers()

  const watchedDirs = [
    rootDir,
    join(rootDir, "actions"),
    join(rootDir, "jobs"),
    join(rootDir, "plugins"),
    join(rootDir, "locales"),
    join(rootDir, "views"),
  ].filter(d => existsSync(d))

  for (const dir of watchedDirs) {
    try {
      const w = watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename) return
        const p = typeof filename === "string" ? filename : filename.toString()
        // Only restart for source files
        if (!/\.(yaml|yml|ts|js|tsx|jsx|json|css)$/i.test(p)) return
        // Ignore node_modules and dist
        if (p.includes("node_modules") || p.includes("/dist/") || p.includes("\\dist\\")) return

        scheduleRestart(rootDir, port, p)
      })
      watchers.push(w)
    } catch {}
  }
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

  // Clear module cache for this project
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
    // Re-create watchers after restart (they were closed by the old server shutdown)
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

  console.log(`\n  \u26A1 Zorux dev server`)
  console.log(`  Root: ${rootDir}`)
  console.log(`  Watching for file changes...`)
  console.log(`  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`)

  try {
    const { createApp } = await import("../core/app")
    currentApp = await createApp(rootDir)
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
