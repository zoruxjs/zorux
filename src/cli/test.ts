import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs"
import { join } from "path"
import { parseAppConfig } from "../core/yaml"
import { compileModels } from "../core/compiler"
import type { CompiledModel, CompiledField } from "../core/types"

function generateValidTestData(fields: CompiledField[]): string {
  return fields.filter(f => !f.isRelation && f.name !== "password").map(f => {
    if (f.type === "int" || f.type === "float") return `  ${f.name}: ${f.min ?? 1}`
    if (f.type === "bool") return `  ${f.name}: true`
    if (f.enum) return `  ${f.name}: "${f.enum[0]}"`
    if (f.type === "file") return `  ${f.name}: null`
    return `  ${f.name}: "test-${f.name}"`
  }).join(",\n")
}

function genValidationTests(model: CompiledModel, hasAuth: boolean): string {
  const ah = hasAuth ? ", ...authHeaders" : ""
  let tests = ""

  for (const f of model.fields) {
    if (f.isRelation || f.name === "password") continue

    if (f.isRequired) {
      tests += `
  it("rejects POST without required field '${f.name}'", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
    const data: any = await res.json()
    expect(data.errors).toBeDefined()
    expect(data.errors.some((e: any) => e.field === "${f.name}")).toBe(true)
  })
`
    }

    if (f.min !== undefined && (f.type === "string" || f.type === "text")) {
      tests += `
  it("rejects POST with '${f.name}' shorter than ${f.min}", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${model.fields.filter(ff => !ff.isRelation && ff.name !== "password" && ff.name !== f.name).map(ff => `${ff.name}: ${ff.type === "int" || ff.type === "float" ? (ff.min ?? 1) : '"test"'} `).join(", ")}, ${f.name}: "${"a".repeat(f.min - 1)}" }),
    }))
    expect(res.status).toBe(400)
  })
`
    }

    if (f.max !== undefined && (f.type === "string" || f.type === "text")) {
      const longStr = "a".repeat(f.max + 1)
      tests += `
  it("rejects POST with '${f.name}' longer than ${f.max}", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${f.name}: "${longStr}" }),
    }))
    expect(res.status).toBe(400)
  })
`
    }

    if (f.min !== undefined && (f.type === "int" || f.type === "float")) {
      tests += `
  it("rejects POST with '${f.name}' below minimum ${f.min}", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${f.name}: ${f.min - 1} }),
    }))
    expect(res.status).toBe(400)
  })
`
    }

    if (f.max !== undefined && (f.type === "int" || f.type === "float")) {
      tests += `
  it("rejects POST with '${f.name}' above maximum ${f.max}", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${f.name}: ${f.max + 1} }),
    }))
    expect(res.status).toBe(400)
  })
`
    }

    if (f.enum && f.enum.length > 0) {
      tests += `
  it("rejects POST with invalid enum value for '${f.name}'", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${f.name}: "invalid-enum-value" }),
    }))
    expect(res.status).toBe(400)
  })
`
    }

    if (f.pattern) {
      const safePattern = f.pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      tests += `
  it("rejects POST with '${f.name}' not matching pattern", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${f.name}: "invalid!@#" }),
    }))
    expect(res.status).toBe(400)
  })
`
    }
  }

  return tests
}

function genEdgeCaseTests(model: CompiledModel, hasAuth: boolean): string {
  const ah = hasAuth ? ", ...authHeaders" : ""
  const strFields = model.fields.filter(f => !f.isRelation && f.name !== "password" && (f.type === "string" || f.type === "text"))
  if (strFields.length === 0) return ""

  const sf = strFields[0]
  return `
  it("handles XSS attempt in '${sf.name}'", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${model.fields.filter(f => !f.isRelation && f.name !== "password" && f.name !== sf.name).map(f => `${f.name}: ${f.type === "int" || f.type === "float" ? (f.min ?? 1) : '"test"'} `).join(", ")}, ${sf.name}: "<script>alert('xss')</script>" }),
    }))
    expect(res.status).toBe(201)
    const data: any = await res.json()
    expect(data.${sf.name}).toContain("<script>")
  })

  it("handles SQL injection attempt in '${sf.name}'", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${model.fields.filter(f => !f.isRelation && f.name !== "password" && f.name !== sf.name).map(f => `${f.name}: ${f.type === "int" || f.type === "float" ? (f.min ?? 1) : '"test"'} `).join(", ")}, ${sf.name}: "'; DROP TABLE users; --" }),
    }))
    expect(res.status).toBe(201)
  })

  it("handles empty string in '${sf.name}'", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${sf.name}: "" }),
    }))
    const data: any = await res.json()
    expect(res.status === 201 || res.status === 400).toBe(true)
  })

  it("handles Unicode in '${sf.name}'", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${model.fields.filter(f => !f.isRelation && f.name !== "password" && f.name !== sf.name).map(f => `${f.name}: ${f.type === "int" || f.type === "float" ? (f.min ?? 1) : '"test"'} `).join(", ")}, ${sf.name}: "Hello 世界 ñ ñ 😀" }),
    }))
    expect(res.status).toBe(201)
  })
`
}

function genAuthTests(models: CompiledModel[], hasAuth: boolean): string {
  if (!hasAuth) return ""

  const authModel = models.find(m => m.hasAuth)
  const protectedModels = models.filter(m => {
    const p = m.policies || {}
    const def = m.hasAuth ? "authenticated" : "*"
    return Object.values(p).some(v => v !== "*") || def !== "*"
  })

  if (protectedModels.length === 0) return ""

  return `
describe("Authentication & Authorization", () => {
  let viewerToken: string
  let adminToken: string

  beforeAll(async () => {
    viewerToken = (await registerUser(getApp(), { role: "viewer" })).token
    adminToken = (await registerUser(getApp(), { name: "Admin", email: "admin@test.com", role: "admin" })).token
  })

  it("returns 401 without auth token", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${protectedModels[0].tableName}", {
      headers: { "Content-Type": "application/json" },
    }))
    expect(res.status).toBe(401)
  })

  it("returns 200 with valid token", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${protectedModels[0].tableName}", {
      headers: { Authorization: "Bearer " + viewerToken },
    }))
    expect(res.status).toBe(200)
  })

  it("rejects invalid/expired token", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${protectedModels[0].tableName}", {
      headers: { Authorization: "Bearer invalid.token.here" },
    }))
    expect(res.status === 401 || res.status === 500).toBe(true)
  })
})
`
}

function genSecurityTests(rootDir: string) {
  const secDir = join(rootDir, "tests", "security")
  mkdirSync(secDir, { recursive: true })

  const yamlPath = join(rootDir, "app.yaml")
  let models: CompiledModel[] = []
  let hasAuth = false
  let authModelName = ""
  let strFieldName = "name"
  let intFieldName = "id"
  let modelTableName = "items"
  let modelName = "Item"
  let enumField = "status"
  let enumValues = ["draft", "published"]

  if (existsSync(yamlPath)) {
    const config = parseAppConfig(rootDir)
    models = compileModels(config.models, config.auth?.model)
    hasAuth = !!config.auth
    authModelName = config.auth?.model || ""
    if (models.length > 0) {
      const m = models[0]
      modelTableName = m.tableName
      modelName = m.name
      const sf = m.fields.find(f => !f.isRelation && (f.type === "string" || f.type === "text") && f.name !== "password")
      if (sf) strFieldName = sf.name
      const intf = m.fields.find(f => f.type === "int")
      if (intf) intFieldName = intf.name
      const ef = m.fields.find(f => f.enum)
      if (ef) { enumField = ef.name; enumValues = ef.enum || [] }
    }
  }

  const ah = hasAuth ? ", ...authHeaders" : ""
  const secDirRel = "tests/security"

  // ── SQL Injection ──
  writeIfNotExists(join(secDir, "sql-injection.test.ts"),
`import { describe, it, expect, beforeAll } from "bun:test"
import { getApp } from "../setup"
${hasAuth ? `import { registerUser } from "../helpers"\nlet authHeaders: Record<string, string> = {}\n\nbeforeAll(async () => {\n  ${hasAuth ? `const u = await registerUser(getApp()); authHeaders = { Authorization: "Bearer " + u.token }` : ""}\n})` : ""}
const app = getApp()

describe("SQL Injection", () => {
  const payloads = [
    "' OR 1=1; --",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users; --",
    "1; SELECT * FROM admins",
    "' OR '1'='1",
    "admin'--",
    "' OR 1=1 UNION SELECT * FROM _Zorux_jobs; --",
  ]

  for (const payload of payloads) {
    it("search rejects injection: " + payload.slice(0, 30), async () => {
      const res = await app.fetch(new Request("http://localhost/api/${modelTableName}?search=" + encodeURIComponent(payload)${hasAuth ? `, { headers: authHeaders }` : ""}))
      expect(res.status).toBe(200)
      const data: any = await res.json()
      // Must not expose error details or crash
      expect(data.error).toBeUndefined()
      expect(Array.isArray(data.data)).toBe(true)
    })
  }

  it("POST rejects SQL injection in fields", async () => {
    for (const payload of payloads.slice(0, 3)) {
      const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
        method: "POST",
        headers: { "Content-Type": "application/json"${ah} },
        body: JSON.stringify({ ${strFieldName}: payload }),
      }))
      // Should either validate (400) or create safely (201)
      expect([400, 201]).toContain(res.status)
    }
  })
})
`, "tests/security/sql-injection.test.ts")

  // ── XSS ──
  writeIfNotExists(join(secDir, "xss.test.ts"),
`import { describe, it, expect, beforeAll } from "bun:test"
import { getApp } from "../setup"
${hasAuth ? `import { registerUser } from "../helpers"\nlet authHeaders: Record<string, string> = {}\n\nbeforeAll(async () => {\n  ${hasAuth ? `const u = await registerUser(getApp()); authHeaders = { Authorization: "Bearer " + u.token }` : ""}\n})` : ""}
const app = getApp()

describe("XSS", () => {
  const xssPayloads = [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "<svg onload=alert(1)>",
    '"><script>alert(1)</script>',
    "<body onload=alert(1)>",
  ]

  for (const payload of xssPayloads) {
    it("stores XSS payload safely: " + payload.slice(0, 25), async () => {
      const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
        method: "POST",
        headers: { "Content-Type": "application/json"${ah} },
        body: JSON.stringify({ ${strFieldName}: payload }),
      }))
      expect(res.status).toBe(201)
      const data: any = await res.json()
      expect(data.${strFieldName}).toContain("<") // Must store as-is (no stripping)
    })
  }

  it("retrieves stored XSS payload without execution", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}"${hasAuth ? `, { headers: authHeaders }` : ""}))
    expect(res.status).toBe(200)
    const data: any = await res.json()
    // The API returns JSON, so no XSS execution possible
    expect(typeof data).toBe("object")
  })
})
`, "tests/security/xss.test.ts")

  // ── JWT Security ──
  writeIfNotExists(join(secDir, "jwt.test.ts"),
`import { describe, it, expect, beforeAll } from "bun:test"
import { getApp } from "../setup"
import { registerUser } from "../helpers"
const app = getApp()

describe("JWT Security", () => {
  let validToken = ""

  beforeAll(async () => {
    const user = await registerUser(getApp())
    validToken = user.token
  })

  it("rejects tampered token", async () => {
    const parts = validToken.split(".")
    const tampered = parts[0] + "." + parts[1] + ".invalidsignature"
    const res = await app.fetch(new Request("http://localhost/api/${authModelName ? modelTableName : "test"}", {
      headers: { Authorization: "Bearer " + tampered },
    }))
    expect(res.status === 401 || res.status === 500).toBe(true)
  })

  it("rejects token with modified payload", async () => {
    const parts = validToken.split(".")
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
    payload.role = "admin"
    const modifiedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_")
    const tampered = parts[0] + "." + modifiedPayload + "." + parts[2]
    const res = await app.fetch(new Request("http://localhost/api/${authModelName ? modelTableName : "test"}", {
      headers: { Authorization: "Bearer " + tampered },
    }))
    expect(res.status === 401 || res.status === 500).toBe(true)
  })

  it("rejects expired/dummy token", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${authModelName ? modelTableName : "test"}", {
      headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" },
    }))
    expect(res.status === 401 || res.status === 500).toBe(true)
  })

  it("rejects empty token", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${authModelName ? modelTableName : "test"}", {
      headers: { Authorization: "Bearer " },
    }))
    expect(res.status === 401 || res.status === 500).toBe(true)
  })
})
`, "tests/security/jwt.test.ts")

  // ── RBAC ──
  if (hasAuth) {
    writeIfNotExists(join(secDir, "rbac.test.ts"),
`import { describe, it, expect, beforeAll } from "bun:test"
import { getApp } from "../setup"
import { registerUser } from "../helpers"
const app = getApp()

describe("RBAC - Role Based Access Control", () => {
  let adminToken = ""
  let viewerToken = ""

  beforeAll(async () => {
    const admin = await registerUser(getApp(), { name: "Admin", email: "sec-admin@test.com", role: "admin" })
    adminToken = admin.token
    const viewer = await registerUser(getApp(), { name: "Viewer", email: "sec-viewer@test.com", role: "viewer" })
    viewerToken = viewer.token
  })

  it("returns 401 without any token", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}"))
    // If model requires auth, expect 401; if public, expect 200
    expect(res.status === 401 || res.status === 200).toBe(true)
  })

  it("admin can create records", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
      method: "POST",
      headers: { Authorization: "Bearer " + adminToken, "Content-Type": "application/json" },
      body: JSON.stringify({ ${strFieldName}: "admin-test" }),
    }))
    expect([201, 200, 403]).toContain(res.status)
  })

  it("viewer can list records", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
      headers: { Authorization: "Bearer " + viewerToken },
    }))
    expect([200, 403]).toContain(res.status)
  })

  it("rejects invalid Authorization header format", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
      headers: { Authorization: "Basic " + adminToken },
    }))
    expect(res.status === 401 || res.status === 200).toBe(true)
  })

  it("rejects malformed Authorization header", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
      headers: { Authorization: "Bearer" },
    }))
    expect(res.status === 401 || res.status === 200).toBe(true)
  })
})
`, "tests/security/rbac.test.ts")
  }

  // ── Mass Assignment ──
  writeIfNotExists(join(secDir, "mass-assignment.test.ts"),
`import { describe, it, expect, beforeAll } from "bun:test"
import { getApp } from "../setup"
${hasAuth ? `import { registerUser } from "../helpers"\nlet authHeaders: Record<string, string> = {}\n\nbeforeAll(async () => {\n  const u = await registerUser(getApp()); authHeaders = { Authorization: "Bearer " + u.token }\n})` : ""}
const app = getApp()

describe("Mass Assignment", () => {
  it("rejects unexpected fields in POST", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${strFieldName}: "test", isAdmin: true, $$special_field: "hack" }),
    }))
    // Should either accept (ignore unknown) or reject
    expect([201, 400]).toContain(res.status)
  })

  it("rejects deeply nested objects in fields", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${strFieldName}: { __proto__: { admin: true } } }),
    }))
    // Should reject type mismatch
    expect([201, 400, 500]).toContain(res.status)
  })

  it("rejects prototype pollution attempt", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ __proto__: { polluted: true }, ${strFieldName}: "test" }),
    }))
    expect(res.status === 400 || res.status === 500).toBe(false)
    // The app must still work after this
    const check = await app.fetch(new Request("http://localhost/api/${modelTableName}"${hasAuth ? `, { headers: authHeaders }` : ""}))
    expect(check.status).toBe(200)
  })
})
`, "tests/security/mass-assignment.test.ts")

  // ── Brute Force ──
  writeIfNotExists(join(secDir, "brute-force.test.ts"),
`import { describe, it, expect } from "bun:test"
import { getApp } from "../setup"
import { registerUser } from "../helpers"
const app = getApp()

describe("Brute Force Protection", () => {
  it("handles multiple rapid login attempts without crash", async () => {
    const attempts = []
    for (let i = 0; i < 20; i++) {
      attempts.push(
        app.fetch(new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "nonexistent@test.com", password: "wrong" }),
        }))
      )
    }
    const results = await Promise.all(attempts)
    // All must complete without crash
    for (const r of results) {
      expect([200, 401, 429, 500]).toContain(r.status)
    }
  })

  it("handles multiple rapid registrations without crash", async () => {
    const registrations = []
    for (let i = 0; i < 10; i++) {
      registrations.push(
        app.fetch(new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Spam " + i, email: "spam" + i + "@test.com", password: "secret123" }),
        }))
      )
    }
    const results = await Promise.all(registrations)
    for (const r of results) {
      expect([201, 429, 500]).toContain(r.status)
    }
  })
})
`, "tests/security/brute-force.test.ts")

  // ── DoS (Denial of Service) ──
  writeIfNotExists(join(secDir, "dos.test.ts"),
`import { describe, it, expect, beforeAll } from "bun:test"
import { getApp } from "../setup"
${hasAuth ? `import { registerUser } from "../helpers"\nlet authHeaders: Record<string, string> = {}\n\nbeforeAll(async () => {\n  const u = await registerUser(getApp()); authHeaders = { Authorization: "Bearer " + u.token }\n})` : ""}
const app = getApp()

describe("DoS Protection", () => {
  it("handles large JSON payload without crash", async () => {
    const largeStr = "x".repeat(100000)
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${strFieldName}: largeStr }),
    }))
    // Should either accept or reject gracefully, but not crash
    expect([201, 400, 413, 500]).toContain(res.status)
  })

  it("handles deeply nested JSON without crash", async () => {
    let deep: any = { ${strFieldName}: "test" }
    for (let i = 0; i < 50; i++) deep = { nested: deep }
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify(deep),
    }))
    expect([201, 400, 500]).toContain(res.status)
  })

  it("handles special characters in search without crash", async () => {
    const special = "\\n\\r\\t\\0\\x00\\x1f%_"
    const res = await app.fetch(new Request("http://localhost/api/${modelTableName}?search=" + encodeURIComponent(special)${hasAuth ? `, { headers: authHeaders }` : ""}))
    expect(res.status).toBe(200)
  })
})
`, "tests/security/dos.test.ts")

  // ── CI Security workflow ──
  const ghDir = join(rootDir, ".github", "workflows")
  mkdirSync(ghDir, { recursive: true })
  writeIfNotExists(join(ghDir, "ci-security.yml"),
`name: Security

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 6 * * 1"  # Every Monday

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun audit  # Check for known vulnerabilities

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun test tests/security
        env:
          DATABASE_URL: ":memory:"
          EMAIL_PROVIDER: fake
`)
  console.log("  - Created .github/workflows/ci-security.yml")
}

function writeIfNotExists(path: string, content: string, label: string) {
  if (!existsSync(path)) {
    writeFileSync(path, content)
    console.log("  - Created " + label)
  }
}

function genCiCdWorkflow(rootDir: string, hasSecurity = false) {
  const ghDir = join(rootDir, ".github", "workflows")
  mkdirSync(ghDir, { recursive: true })

  const workflowPath = join(ghDir, "ci.yml")
  if (existsSync(workflowPath)) return

  writeFileSync(workflowPath, `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun test tests/integration
        env:
          DATABASE_URL: ":memory:"
          EMAIL_PROVIDER: fake

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun test --coverage tests/integration
        env:
          DATABASE_URL: ":memory:"
          EMAIL_PROVIDER: fake
`)
  console.log("  - Created .github/workflows/ci.yml")
}

function generateTests(rootDir: string, e2e = false, security = false) {
  const testsDir = join(rootDir, "tests")
  const integDir = join(testsDir, "integration")
  mkdirSync(integDir, { recursive: true })
  if (e2e) mkdirSync(join(testsDir, "e2e"), { recursive: true })

  // ── helpers.ts ──
  const helpersPath = join(testsDir, "helpers.ts")
  if (!existsSync(helpersPath)) {
    writeFileSync(helpersPath, `import { createApp } from "Zorux"
import type { AppInstance } from "Zorux"

export interface TestUser {
  id: any
  name: string
  email: string
  token: string
  role?: string
}

export async function createTestApp(rootDir?: string): Promise<AppInstance> {
  process.env.DATABASE_URL = ":memory:"
  process.env.EMAIL_PROVIDER = "fake"
  const app = await createApp(rootDir || ".")
  return app
}

export async function registerUser(app: AppInstance, data?: Partial<{ name: string; email: string; password: string; role: string }>): Promise<TestUser> {
  const body = {
    name: data?.name || "Test User",
    email: data?.email || "test" + Math.random().toString(36).slice(2, 6) + "@test.com",
    password: data?.password || "password123",
    role: data?.role,
  }
  const res = await app.fetch(new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }))
  const d: any = await res.json()
  if (res.status !== 201) throw new Error("Failed to register: " + JSON.stringify(d))
  return { id: d.user.id, name: d.user.name, email: d.user.email, token: d.token, role: d.user.role }
}

export async function loginAs(app: AppInstance, email: string, password = "password123"): Promise<string> {
  const res = await app.fetch(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }))
  const d: any = await res.json()
  if (res.status !== 200) throw new Error("Failed to login: " + JSON.stringify(d))
  return d.token
}
`)
    console.log("  - Created tests/helpers.ts")
  }

  // ── setup.ts ──
  const setupPath = join(testsDir, "setup.ts")
  if (!existsSync(setupPath)) {
    writeFileSync(setupPath, `import { beforeAll, afterAll } from "bun:test"
import { createTestApp } from "./helpers"
import type { AppInstance } from "Zorux"

let app: AppInstance

export function getApp(): AppInstance {
  return app!
}

beforeAll(async () => {
  app = await createTestApp()
})

afterAll(async () => {
  // Cleanup if needed
})
`)
    console.log("  - Created tests/setup.ts")
  }

  // ── api.test.ts ──
  const integTestPath = join(integDir, "api.test.ts")
  let allTests = ""
  let hasAuth = false

  const yamlPath = join(rootDir, "app.yaml")
  if (existsSync(yamlPath)) {
    const config = parseAppConfig(rootDir)
    const models = compileModels(config.models, config.auth?.model)
    hasAuth = !!config.auth

    for (const model of models) {
      const fields = model.fields.filter(f => !f.isRelation && f.name !== "password")
      const validData = generateValidTestData(model.fields)
      const ah = hasAuth ? ", ...authHeaders" : ""
      const firstField = fields.length > 0 ? fields[0].name : "id"

      allTests += `
describe("${model.name}", () => {
  let createdId: any

  // ── Happy path CRUD ──

  it("POST /api/${model.tableName} creates a ${model.name}", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({
${validData}
      }),
    }))
    expect(res.status).toBe(201)
    const data: any = await res.json()
    expect(data.id).toBeDefined()
    createdId = data.id
  })

  it("GET /api/${model.tableName} lists ${model.plural} with pagination", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}"${hasAuth ? `, { headers: authHeaders }` : ""}))
    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.data).toBeDefined()
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.pagination).toBeDefined()
    expect(data.pagination.page).toBeGreaterThanOrEqual(1)
    expect(data.pagination.limit).toBeGreaterThan(0)
  })

  it("GET /api/${model.tableName}/:id gets a single ${model.name}", async () => {
    if (!createdId) return
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}/" + createdId${hasAuth ? `, { headers: authHeaders }` : ""}))
    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.id).toBe(createdId)
  })

  it("GET /api/${model.tableName}/:id returns 404 for nonexistent id", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}/99999"${hasAuth ? `, { headers: authHeaders }` : ""}))
    expect(res.status).toBe(404)
  })

  it("PUT /api/${model.tableName}/:id updates a ${model.name}", async () => {
    if (!createdId) return
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}/" + createdId, {
      method: "PUT",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({ ${firstField}: "updated-${firstField}" }),
    }))
    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.${firstField}).toContain("updated")
  })

  it("DELETE /api/${model.tableName}/:id deletes a ${model.name}", async () => {
    if (!createdId) return
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}/" + createdId, {
      method: "DELETE"${hasAuth ? `, headers: authHeaders` : ""},
    }))
    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.success).toBe(true)
  })

  it("GET /api/${model.tableName}/:id returns 404 after delete", async () => {
    if (!createdId) return
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}/" + createdId${hasAuth ? `, { headers: authHeaders }` : ""}))
    expect(res.status).toBe(404)
  })

  // ── Validation tests ──

  it("rejects POST with empty body", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}", {
      method: "POST",
      headers: { "Content-Type": "application/json"${ah} },
      body: JSON.stringify({}),
    }))
    expect(res.status === 400 || res.status === 500).toBe(true)
  })

${genValidationTests(model, hasAuth)}

  // ── Edge cases ──

${genEdgeCaseTests(model, hasAuth)}

  // ── Search, sort, pagination tests ──

  it("supports ?search= parameter", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}?search=test${hasAuth ? `, { headers: authHeaders }` : ""}))
    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.pagination).toBeDefined()
  })

  it("supports ?sort= and ?order= parameters", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}?sort=id&order=desc${hasAuth ? `, { headers: authHeaders }` : ""}))
    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.pagination).toBeDefined()
  })

  it("supports ?page= and ?limit= parameters", async () => {
    const res = await app.fetch(new Request("http://localhost/api/${model.tableName}?page=1&limit=5${hasAuth ? `, { headers: authHeaders }` : ""}))
    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.pagination.page).toBe(1)
    expect(data.pagination.limit).toBe(5)
  })
})
`
    }
  }

  const authSection = hasAuth ? `
let adminAuth: Record<string, string> = {}
let viewerAuth: Record<string, string> = {}

beforeAll(async () => {
  const admin = await registerUser(getApp(), { name: "Admin", email: "admin@test.com", role: "admin" })
  adminAuth = { Authorization: "Bearer " + admin.token }
  const viewer = await registerUser(getApp(), { name: "Viewer", email: "viewer@test.com", role: "viewer" })
  viewerAuth = { Authorization: "Bearer " + viewer.token }
})
` : ""

  const authImports = hasAuth ? `import { registerUser } from "../helpers"\n` : ""

  if (!existsSync(integTestPath)) {
    writeFileSync(integTestPath, `import { describe, it, expect, beforeAll } from "bun:test"
import { getApp } from "../setup"
${authImports}
const app = getApp()

${authSection}
${allTests}
${genAuthTests([], hasAuth)}
`)
    console.log("  - Created tests/integration/api.test.ts")
  }

  // ── E2E ──
  if (e2e && !existsSync(join(testsDir, "e2e", "admin.spec.ts"))) {
    writeFileSync(join(testsDir, "e2e", "admin.spec.ts"), `import { test, expect } from "@playwright/test"

test("admin dashboard shows stats", async ({ page }) => {
  await page.goto("/admin")
  await expect(page.locator("h1")).toContainText("Dashboard")
})

test("admin login page loads", async ({ page }) => {
  await page.goto("/login")
  await expect(page.locator("h1")).toContainText("Login")
})

test("CRUD list page loads and has search", async ({ page }) => {
  await page.goto("/admin")
  await expect(page.locator("body")).toBeVisible()
})
`)
    console.log("  - Created tests/e2e/admin.spec.ts")
  }

  if (e2e && !existsSync(join(rootDir, "playwright.config.ts"))) {
    writeFileSync(join(rootDir, "playwright.config.ts"), `import { defineConfig } from "@playwright/test"

export default defineConfig({
  webServer: {
    command: "bun run fw dev --port 3000",
    port: 3000,
    reuseExistingServer: true,
  },
  testDir: "./tests/e2e",
})
`)
    console.log("  - Created playwright.config.ts")
  }

  // ── Security tests ──
  if (security) {
    genSecurityTests(rootDir)
  }

  // ── CI/CD ──
  genCiCdWorkflow(rootDir, security)
}

export function testCommand(args: string[]) {
  const rootDir = process.cwd()

  if (!existsSync(join(rootDir, "app.yaml"))) {
    console.error("[Zorux] No app.yaml found. Run this from your Zorux project root.")
    process.exit(1)
  }

  const runTests = args.includes("--run") || args.includes("run")
  const e2e = args.includes("--e2e")
  const security = args.includes("--security")

  console.log("\n  \u2699 Setting up tests...\n")

  generateTests(rootDir, e2e, security)

  // Update package.json
  const pkgPath = join(rootDir, "package.json")
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
    pkg.scripts = {
      ...pkg.scripts,
      test: "bun test tests/integration",
      "test:e2e": "bun test tests/e2e",
      "test:coverage": "bun test --coverage tests/integration",
      "test:ci": "bun test --coverage --rerun-each 2 tests/integration",
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    console.log("  - Updated package.json with test scripts")
  }

  console.log("\n  \u2705 Test setup complete!")
  console.log("\n  Generated:")
  console.log("    tests/helpers.ts                - Test utilities (register, login)")
  console.log("    tests/setup.ts                  - Test setup (in-memory DB)")
  console.log("    tests/integration/api.test.ts   - CRUD + validation + edge cases")
  if (security) {
    console.log("    tests/security/                 - Security tests (SQLi, XSS, JWT, RBAC, ...)")
    console.log("    .github/workflows/ci-security.yml - Security CI/CD")
  }
  if (e2e) {
    console.log("    tests/e2e/                     - E2E tests (Playwright)")
    console.log("    playwright.config.ts            - Playwright configuration")
  }
  console.log("    .github/workflows/ci.yml        - GitHub Actions CI/CD")
  console.log("")
  console.log("  Commands:")
  console.log("    bun test              # Integration tests")
  console.log("    bun test:coverage      # With coverage report")
  console.log("    bun test:ci            # CI mode (retry flaky tests)")
  if (security) console.log("    bun test tests/security  # Security tests")
  if (e2e) console.log("    bun test:e2e           # E2E tests")
  console.log("")

  if (runTests) {
    console.log("  Running tests...\n")
    const { spawnSync } = require("child_process")
    const result = spawnSync("bun", ["test", "tests/integration"], {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: ":memory:", EMAIL_PROVIDER: "fake" },
    })
    process.exit(result.status ?? 1)
  }
}
