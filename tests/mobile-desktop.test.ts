import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { join } from "path"
import { mkdtempSync, existsSync, readFileSync, rmSync, readdirSync } from "fs"
import { tmpdir } from "os"
import { execSync } from "child_process"

const CLI = join(import.meta.dir, "../dist/index.js")
const ZORUX = `bun ${CLI}`

describe("Mobile (Expo) generation — structural validation", () => {
  let dir: string, projectDir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "zorux-mobile-test-"))
    projectDir = join(dir, "test-mobile")
    execSync(`${ZORUX} new test-mobile --preset web`, { cwd: dir, timeout: 15000, shell: true })
  })

  it("generates mobile project", () => {
    execSync(`${ZORUX} gen mobile`, { cwd: projectDir, timeout: 30000, shell: true })
    expect(existsSync(join(projectDir, "mobile"))).toBe(true)
  })

  it("creates expected directories", () => {
    const mobileDir = join(projectDir, "mobile")
    expect(existsSync(join(mobileDir, "app"))).toBe(true)
    expect(existsSync(join(mobileDir, "src", "api", "client.ts"))).toBe(true)
  })

  it("generates SDK client code", () => {
    const mobileDir = join(projectDir, "mobile")
    const allFiles = readdirSync(join(mobileDir, "src"), { recursive: true }).filter(f => f.endsWith(".ts") || f.endsWith(".tsx"))
    const hasClient = allFiles.some(f => f.includes("client") || f.includes("api"))
    expect(hasClient).toBe(true)
  })

  it("generates model screens", () => {
    const mobileDir = join(projectDir, "mobile")
    const allFiles = readdirSync(join(mobileDir, "app"), { recursive: true }).filter(f => f.endsWith(".tsx"))
    expect(allFiles.length).toBeGreaterThan(2)
    // Should have model-specific screens
    const hasModelScreen = allFiles.some(f => f.includes("User") || f.includes("users") || f.includes("[id]"))
    expect(hasModelScreen).toBe(true)
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })
})

describe("Desktop (Tauri) generation — structural validation", () => {
  let dir: string, projectDir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "zorux-desktop-test-"))
    projectDir = join(dir, "test-desktop")
    execSync(`${ZORUX} new test-desktop --preset web`, { cwd: dir, timeout: 15000, shell: true })
  })

  it("generates desktop project", () => {
    execSync(`${ZORUX} gen desktop`, { cwd: projectDir, timeout: 30000, shell: true })
    expect(existsSync(join(projectDir, "desktop"))).toBe(true)
  })

  it("creates src-tauri directory", () => {
    const tauriDir = join(projectDir, "desktop", "src-tauri")
    expect(existsSync(tauriDir)).toBe(true)
    const files = readdirSync(tauriDir)
    expect(files.length).toBeGreaterThan(0)
  })

  it("generates Cargo.toml", () => {
    const cargoPath = join(projectDir, "desktop", "src-tauri", "Cargo.toml")
    expect(existsSync(cargoPath)).toBe(true)
    const content = readFileSync(cargoPath, "utf-8")
    expect(content).toContain("tauri")
  })

  it("generates tauri.conf.json with valid config", () => {
    const confPath = join(projectDir, "desktop", "src-tauri", "tauri.conf.json")
    expect(existsSync(confPath)).toBe(true)
    const conf = JSON.parse(readFileSync(confPath, "utf-8"))
    expect(conf.build).toBeDefined()
    expect(conf.bundle).toBeDefined()
  })

  it("generates Rust source", () => {
    const mainPath = join(projectDir, "desktop", "src-tauri", "src", "main.rs")
    expect(existsSync(mainPath)).toBe(true)
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })
})
