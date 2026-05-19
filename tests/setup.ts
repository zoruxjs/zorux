import { join } from "path"
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "fs"
import { tmpdir } from "os"

let appModule: any = null

export interface TestContext {
  appDir: string
  fetch: (req: Request) => Promise<Response>
  cleanup: () => void
}

export function createTestDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "Zorux-test-"))
  const yamlContent = readFileSync(join(import.meta.dir, "app-test.yaml"), "utf-8")
  writeFileSync(join(dir, "app.yaml"), yamlContent)
  for (const sub of ["actions", "jobs", "locales"]) {
    mkdirSync(join(dir, sub), { recursive: true })
  }
  return dir
}

export async function createTestApp(): Promise<TestContext> {
  if (!appModule) {
    appModule = await import("../src/core/app")
  }
  const appDir = createTestDir()
  const app = await appModule.createApp(appDir)
  const fetch = (req: Request) => app.fetch(req)
  return {
    appDir,
    fetch,
    cleanup: () => {
      try { rmSync(appDir, { recursive: true, force: true }) } catch {}
    },
  }
}

export function json(res: Response): Promise<any> {
  return res.json()
}

export function req(method: string, path: string, body?: any, token?: string): Request {
  const opts: any = {
    method,
    headers: { "Content-Type": "application/json" },
  }
  if (body) opts.body = JSON.stringify(body)
  if (token) opts.headers["Authorization"] = `Bearer ${token}`
  return new Request(`http://localhost${path}`, opts)
}

export async function registerUser(ctx: TestContext, name: string, email: string, password: string): Promise<string> {
  const res = await ctx.fetch(req("POST", "/api/auth/register", { name, email, password }))
  const data = await json(res)
  return data.token
}

export async function loginUser(ctx: TestContext, email: string, password: string): Promise<string> {
  const res = await ctx.fetch(req("POST", "/api/auth/login", { email, password }))
  const data = await json(res)
  return data.token
}
