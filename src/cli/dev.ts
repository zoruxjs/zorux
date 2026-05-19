import { existsSync } from "fs"
import { join } from "path"
import type { AppInstance } from "../core/app"

let currentApp: AppInstance | null = null
let restartTimer: ReturnType<typeof setTimeout> | null = null

function createWatcher(rootDir: string, port: number) {
  if (typeof Bun === "undefined") return

  const watchedDirs = [
    rootDir,
    join(rootDir, "actions"),
    join(rootDir, "jobs"),
    join(rootDir, "plugins"),
    join(rootDir, "locales"),
  ].filter(d => existsSync(d))

  const watcher = Bun.watch(watchedDirs, { recursive: true })
  watcher.addEventListener("change", (event) => {
    const p = event.path || ""
    // Only restart for source files
    if (!/\.(yaml|yml|ts|js|tsx|jsx|json)$/i.test(p)) return
    // Ignore node_modules and dist
    if (p.includes("node_modules") || p.includes("/dist/")) return

    scheduleRestart(rootDir, port, p)
  })
}

function scheduleRestart(rootDir: string, port: number, changedPath: string) {
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = setTimeout(async () => {
    await doRestart(rootDir, port, changedPath)
  }, 300)
}

async function doRestart(rootDir: string, port: number, changedPath: string) {
  console.log(`\n  ?? Reloading: ${changedPath.split(/[/\\]/).pop()}`)
  console.log(`  ---------------------------------`)

  // Remove old module from Bun's require cache
  for (const key of Object.keys(Bun?.main?.loader?.registry || {})) {
    if (key.includes(rootDir)) {
      try { delete Bun.main.loader.registry[key] } catch {}
    }
  }

  try {
    const { createApp } = await import("../core/app")
    const newApp = await createApp(rootDir)

    if (currentApp) {
      // Stop old server
      try {
        const oldServer = (currentApp as any)._server
        if (oldServer?.stop) oldServer.stop()
      } catch {}
    }

    currentApp = newApp
    currentApp.start(port)
  } catch (err: any) {
    console.error(`\n  ? Reload failed: ${err.message}`)
    console.error(`  ${err.stack?.split("\n").slice(0, 3).join("\n  ") || ""}`)
    console.log(`  ? Waiting for file change to retry...`)
  }
}

export async function devCommand(options: { port?: string }) {
  const port = parseInt(options.port || "3000", 10)
  const rootDir = process.cwd()

  if (!existsSync(join(rootDir, "app.yaml"))) {
    console.error("[Zorux] No app.yaml found in current directory")
    process.exit(1)
  }

  console.log(`\n  ? Zorux dev server\n`)
  console.log(`  Root: ${rootDir}`)
  console.log(`  Watching for file changes...`)
  console.log(`  ---------------------------------`)

  try {
    const { createApp } = await import("../core/app")
    currentApp = await createApp(rootDir)
    currentApp.start(port)
  } catch (err: any) {
    console.error(`\n  ? Failed to start: ${err.message}`)
    console.error(`  ${err.stack?.split("\n").slice(0, 3).join("\n  ") || ""}`)
    process.exit(1)
  }

  createWatcher(rootDir, port)
}
