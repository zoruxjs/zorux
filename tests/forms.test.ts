import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { join } from "path"
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { execSync, spawn } from "child_process"

const CLI = join(import.meta.dir, "../dist/index.js")
const ZORUX = `bun ${CLI}`

describe("Declarative forms", () => {
  let dir: string, projectDir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "zorux-forms-test-"))
    projectDir = join(dir, "test-forms")
    execSync(`${ZORUX} new test-forms --preset web`, { cwd: dir, timeout: 15000, shell: true })

    // Add form definition to app.yaml
    const yamlPath = join(projectDir, "app.yaml")
    const yaml = readFileSync(yamlPath, "utf-8")
    writeFileSync(yamlPath, yaml + `
forms:
  subscribe:
    title: Newsletter
    description: Subscribe to our newsletter
    model: User
    fields:
      - name
      - email
    button: Subscribe
    success:
      message: "Thanks for subscribing!"
    honeypot: true
  contact:
    title: Contact Us
    description: Send us a message
    fields:
      - name: name
        type: text
        label: Your Name
        required: true
      - name: email
        type: email
        label: Your Email
        required: true
      - name: message
        type: textarea
        label: Message
        required: true
    button: Send Message
    success:
      message: "Message sent! We'll get back to you."
`, "utf-8")
  })

  it("registers form routes", () => {
    // Just check the route exists by starting server and fetching
    const server = spawn("bun", [CLI, "dev", "5195"], { cwd: projectDir })
    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const res = await fetch("http://localhost:5195/forms/subscribe")
          expect(res.status).toBe(200)
          const html = await res.text()
          expect(html).toContain("Newsletter")
          expect(html).toContain('name="email"')
          expect(html).toContain("Subscribe")
          server.kill()
          resolve()
        } catch (e) {
          server.kill()
          reject(e)
        }
      }, 4000)
    })
  }, 15000)

  it("renders contact form with textarea", () => {
    const server = spawn("bun", [CLI, "dev", "5194"], { cwd: projectDir })
    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const res = await fetch("http://localhost:5194/forms/contact")
          expect(res.status).toBe(200)
          const html = await res.text()
          expect(html).toContain("Contact Us")
          expect(html).toContain("<textarea")
          expect(html).toContain("Send Message")
          server.kill()
          resolve()
        } catch (e) {
          server.kill()
          reject(e)
        }
      }, 4000)
    })
  }, 15000)

  it("has honeypot field", () => {
    const server = spawn("bun", [CLI, "dev", "5193"], { cwd: projectDir })
    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const res = await fetch("http://localhost:5193/forms/subscribe")
          const html = await res.text()
          expect(html).toContain('name="_hp"')
          server.kill()
          resolve()
        } catch (e) {
          server.kill()
          reject(e)
        }
      }, 4000)
    })
  }, 15000)

  it("returns success page", () => {
    const server = spawn("bun", [CLI, "dev", "5192"], { cwd: projectDir })
    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const res = await fetch("http://localhost:5192/forms/subscribe/success")
          expect(res.status).toBe(200)
          const html = await res.text()
          expect(html).toContain("Thanks for subscribing")
          server.kill()
          resolve()
        } catch (e) {
          server.kill()
          reject(e)
        }
      }, 4000)
    })
  }, 15000)
})
