import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { join } from "path"
import { mkdtempSync, writeFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { execSync, spawn } from "child_process"

const CLI = join(import.meta.dir, "../dist/index.js")
const ZORUX = `bun ${CLI}`

describe("Hot reload", () => {
  let dir: string, projectDir: string, server: any

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "zorux-hr-test-"))
    projectDir = join(dir, "test-hr")
    execSync(`${ZORUX} new test-hr --preset web`, { cwd: dir, timeout: 15000, shell: true })
    execSync("bun install", { cwd: projectDir, timeout: 60000, shell: true })
  })

  it("starts dev server and responds on health endpoint", async () => {
    server = spawn("bun", [CLI, "dev", "5197"], { cwd: projectDir })
    await new Promise(r => setTimeout(r, 4000))

    const res = await fetch("http://localhost:5197/api/health")
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBeDefined()
  })

  it("injects live reload script into admin page HTML", async () => {
    // Try /login which should return HTML
    const res = await fetch("http://localhost:5197/login")
    const text = await res.text()
    expect(text).toContain("__zorux_livereload")
    expect(text).toContain("EventSource")
  })

  it("serves livereload EventSource endpoint", async () => {
    const res = await fetch("http://localhost:5197/__zorux_livereload")
    expect(res.status).toBe(200)
  })

  it("responds after file change (reload)", async () => {
    // Modify app.yaml
    const yamlPath = join(projectDir, "app.yaml")
    writeFileSync(yamlPath, readFileSync(yamlPath, "utf-8") + "\n# touch for reload\n", "utf-8")

    // Wait for watcher + restart
    await new Promise(r => setTimeout(r, 2000))

    const res = await fetch("http://localhost:5197/api/health")
    expect(res.status).toBe(200)
  })

  afterAll(() => {
    if (server) { try { server.kill() } catch {} }
    rmSync(dir, { recursive: true, force: true })
  })
})

function readFileSync(p: string, enc: BufferEncoding): string {
  return require("fs").readFileSync(p, enc)
}
