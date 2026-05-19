import { readdirSync, existsSync } from "fs"
import { join } from "path"
import type { DataCollection } from "../db"

export interface JobDefinition {
  name: string
  perform: (args: any, context: any) => any | Promise<any>
}

const registeredJobs = new Map<string, JobDefinition>()

export async function loadJobs(rootDir: string): Promise<Map<string, JobDefinition>> {
  const jobsDir = join(rootDir, "jobs")
  if (!existsSync(jobsDir)) return registeredJobs

  const files = readdirSync(jobsDir).filter(f => f.endsWith(".ts") || f.endsWith(".js"))
  for (const file of files) {
    const name = file.replace(/\.(ts|js)$/, "")
    const filePath = join(jobsDir, file)
    try {
      const url = Bun.pathToFileURL(filePath).href
      const mod = await import(url)
      const def: JobDefinition = mod.default || mod
      if (def?.name && def?.perform) {
        registeredJobs.set(def.name, def)
        console.log("  Job loaded: " + def.name)
      } else if (def?.perform) {
        def.name = name
        registeredJobs.set(name, def)
        console.log("  Job loaded: " + name)
      }
    } catch (err: any) {
      console.error("  Failed to load job: " + name + " - " + err.message)
    }
  }
  return registeredJobs
}

export function registerJob(def: JobDefinition) {
  registeredJobs.set(def.name, def)
}

// --- SQL DDL for SQL providers ---

export function createJobsTable(run: Function, provider: string) {
  if (provider === "mongodb") return // MongoDB creates collections on first insert

  const q = (n: string) => n
  const id = provider === "postgres" ? "SERIAL PRIMARY KEY"
    : provider === "mysql" ? "INTEGER AUTO_INCREMENT PRIMARY KEY"
    : "INTEGER PRIMARY KEY AUTOINCREMENT"
  const ts = provider === "sqlite" ? "TEXT" : "TIMESTAMP"

  run(
    "CREATE TABLE IF NOT EXISTS " + q("_Zorux_jobs") + " (" +
    q("id") + " " + id + ", " +
    q("name") + " TEXT NOT NULL, " +
    q("args") + " TEXT DEFAULT '{}', " +
    q("status") + " TEXT DEFAULT 'pending', " +
    q("scheduled_at") + " " + ts + ", " +
    q("created_at") + " " + ts + " DEFAULT CURRENT_TIMESTAMP, " +
    q("started_at") + " " + ts + ", " +
    q("completed_at") + " " + ts + ", " +
    q("error") + " TEXT, " +
    q("retries") + " INTEGER DEFAULT 0, " +
    q("max_retries") + " INTEGER DEFAULT 3, " +
    q("cron") + " TEXT" +
    ")"
  )
}

// --- Job submission ---

export async function submitJob(
  col: DataCollection,
  name: string,
  args: Record<string, any> = {},
  options?: { delay?: number; maxRetries?: number },
): Promise<any> {
  const scheduledAt = options?.delay
    ? new Date(Date.now() + options.delay * 1000).toISOString()
    : new Date().toISOString()

  const created = await col.insert({
    name,
    args: JSON.stringify(args),
    status: "pending",
    scheduled_at: scheduledAt,
    created_at: new Date().toISOString(),
    max_retries: options?.maxRetries ?? 3,
    retries: 0,
  })

  return created?.id || 0
}

// --- Worker ---

let workerTimer: ReturnType<typeof setInterval> | null = null
let isProcessing = false

export function startWorker(col: DataCollection, intervalMs = 1000) {
  if (workerTimer) return

  workerTimer = setInterval(async () => {
    if (isProcessing) return
    isProcessing = true
    try {
      const now = new Date().toISOString()
      const all = await col.find()

      const pending = all.filter((r: any) =>
        r.status === "pending" &&
        (!r.scheduled_at || r.scheduled_at <= now),
      ).slice(0, 10)

      for (const row of pending) {
        const def = registeredJobs.get(row.name)
        if (!def) {
          await col.update(row.id, { status: "failed", error: "Unknown job: " + row.name })
          continue
        }

        await col.update(row.id, { status: "running", started_at: now })

        try {
          let parsedArgs = {}
          try { parsedArgs = JSON.parse(row.args || "{}") } catch {}

          await def.perform(parsedArgs, {})
          await col.update(row.id, { status: "completed", completed_at: now })
        } catch (err: any) {
          const retries = (row.retries || 0) + 1
          const maxRetries = row.max_retries || 3
          const errorMsg = err.message || String(err)

          if (retries >= maxRetries) {
            await col.update(row.id, { status: "failed", error: errorMsg, retries, completed_at: now })
          } else {
            const retryDelay = 5 * Math.pow(2, retries)
            const nextRun = new Date(Date.now() + retryDelay * 1000).toISOString()
            await col.update(row.id, { status: "pending", error: errorMsg, retries, scheduled_at: nextRun })
          }
        }
      }
    } catch (err) {
      console.error("[jobs] Worker error:", err)
    }
    isProcessing = false
  }, intervalMs)

  console.log("  Jobs worker started (polling every " + intervalMs + "ms)")
}

export function stopWorker() {
  if (workerTimer) {
    clearInterval(workerTimer)
    workerTimer = null
  }
}

export function getRegisteredJobs(): Map<string, JobDefinition> {
  return registeredJobs
}
