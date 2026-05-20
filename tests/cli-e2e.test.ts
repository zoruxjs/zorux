import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { join } from "path"
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { execSync, spawn } from "child_process"

const CLI = join(import.meta.dir, "../dist/index.js")
const ZORUX = `bun ${CLI}`

interface TestProject {
  dir: string
  name: string
}

function createProject(name: string, preset: string): TestProject {
  const dir = mkdtempSync(join(tmpdir(), "zorux-e2e-"))
  const result = execSync(`${ZORUX} new ${name} --preset ${preset}`, { cwd: dir })
  return { dir: join(dir, name), name }
}

function hasFile(path: string): boolean {
  return existsSync(path)
}

function readFile(path: string): string {
  return readFileSync(path, "utf-8")
}

describe("CLI e2e — presets generate valid projects", () => {
  const projects: { key: string; preset: string; dir?: string }[] = [
    { key: "api", preset: "api" },
    { key: "web", preset: "web" },
    { key: "saas", preset: "saas" },
    { key: "blog", preset: "blog" },
  ]

  for (const p of projects) {
    it(`zorux new test-${p.key} --preset ${p.preset} creates project structure`, async () => {
      const name = `test-${p.key}-${Date.now()}`
      const dir = mkdtempSync(join(tmpdir(), "zorux-e2e-"))
      execSync(`${ZORUX} new ${name} --preset ${p.preset}`, { cwd: dir, timeout: 15000 })
      const projectDir = join(dir, name)

      // Core files
      expect(hasFile(join(projectDir, "app.yaml"))).toBe(true)
      expect(hasFile(join(projectDir, "package.json"))).toBe(true)
      expect(hasFile(join(projectDir, "tsconfig.json"))).toBe(true)
      expect(hasFile(join(projectDir, ".env"))).toBe(true)

      // App.yaml parseable
      const yaml = readFile(join(projectDir, "app.yaml"))
      expect(yaml).toContain("name: " + name)
      expect(yaml).toContain("database")

      // Has actions dir
      expect(hasFile(join(projectDir, "actions"))).toBe(true)

      // Frontend presets have web/pages
      if (p.preset !== "api") {
        expect(hasFile(join(projectDir, "web", "pages"))).toBe(true)
        expect(hasFile(join(projectDir, "web", "pages", "index.tsx"))).toBe(true)
      }

      // SaaS has extra files
      if (p.preset === "saas") {
        expect(hasFile(join(projectDir, "seed.ts"))).toBe(true)
      }

      // Cleanup
      rmSync(dir, { recursive: true, force: true })
    }, 20000)
  }

  it("zorux new creates minimal project with --minimal", async () => {
    const name = `test-minimal-${Date.now()}`
    const dir = mkdtempSync(join(tmpdir(), "zorux-e2e-"))
    execSync(`${ZORUX} new ${name} --preset web --minimal`, { cwd: dir, timeout: 15000 })
    const projectDir = join(dir, name)

    expect(hasFile(join(projectDir, "app.yaml"))).toBe(true)
    // Minimal should not have web/pages/index.tsx
    expect(hasFile(join(projectDir, "web", "pages", "index.tsx"))).toBe(false)

    rmSync(dir, { recursive: true, force: true })
  }, 20000)
})

describe("CLI e2e — verify command", () => {
  it("zorux verify checks app.yaml validity", async () => {
    const name = `test-verify-${Date.now()}`
    const dir = mkdtempSync(join(tmpdir(), "zorux-e2e-"))
    execSync(`${ZORUX} new ${name} --preset web`, { cwd: dir, timeout: 15000 })
    const projectDir = join(dir, name)

    const result = execSync(`${ZORUX} verify`, { cwd: projectDir, timeout: 10000 })
    const output = result.toString()
    expect(output).toContain("app.yaml parsed")
    expect(output).toContain("checks passed")

    rmSync(dir, { recursive: true, force: true })
  }, 30000)
})

describe("CLI e2e — inspect command", () => {
  it("zorux inspect --json generates .zorux/manifest.json", async () => {
    const name = `test-inspect-${Date.now()}`
    const dir = mkdtempSync(join(tmpdir(), "zorux-e2e-"))
    execSync(`${ZORUX} new ${name} --preset saas`, { cwd: dir, timeout: 15000, shell: true })
    const projectDir = join(dir, name)

    execSync(`${ZORUX} inspect --json`, { cwd: projectDir, timeout: 10000, shell: true })
    const mPath = join(projectDir, ".zorux", "manifest.json")
    expect(existsSync(mPath)).toBe(true)

    const raw = readFileSync(mPath, "utf-8")
    const manifest = JSON.parse(raw)
    expect(manifest.models.length).toBeGreaterThan(0)

    rmSync(dir, { recursive: true, force: true })
  }, 30000)
})

describe("CLI e2e — explain command", () => {
  it("zorux explain shows generation plan", async () => {
    const name = `test-explain-${Date.now()}`
    const dir = mkdtempSync(join(tmpdir(), "zorux-e2e-"))
    execSync(`${ZORUX} new ${name} --preset saas`, { cwd: dir, timeout: 15000, shell: true })
    const projectDir = join(dir, name)

    const result = execSync(`${ZORUX} explain`, { cwd: projectDir, timeout: 10000, shell: true })
    const output = result.toString()
    expect(output).toContain("Generation Plan")
    expect(output).toContain("Routes Generated")

    rmSync(dir, { recursive: true, force: true })
  }, 30000)
})

describe("CLI e2e — server starts (quick smoke test)", () => {
  it("zorux dev starts and responds on health endpoint", async () => {
    const name = `test-smoke-${Date.now()}`
    const dir = mkdtempSync(join(tmpdir(), "zorux-e2e-"))
    execSync(`${ZORUX} new ${name} --preset api`, { cwd: dir, timeout: 15000, shell: true })
    const projectDir = join(dir, name)

    // Install deps
    execSync("bun install", { cwd: projectDir, timeout: 60000, shell: true })

    // Start server in background
    const server = spawn("bun", [CLI, "dev", "5198"], { cwd: projectDir })

    // Wait for startup
    await new Promise(r => setTimeout(r, 4000))

    let status = 0
    try {
      const res = await fetch("http://localhost:5198/api/health")
      status = res.status
    } catch {}
    expect(status).toBe(200)

    server.kill()
    rmSync(dir, { recursive: true, force: true })
  }, 120000)
})
