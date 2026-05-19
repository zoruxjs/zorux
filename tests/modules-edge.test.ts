import { describe, test, expect } from "bun:test"

describe("OpenAPI spec", () => {
  test("generates valid spec", async () => {
    const { generateOpenApiSpec } = await import("../src/core/openapi")
    const models = [
      { name: "post", plural: "posts", tableName: "posts", fields: [{ name: "title", type: "string", isRequired: true, isUnique: false, isRelation: false }], hasAuth: false, hasTimestamps: false },
    ]
    const platform: any = { config: { name: "test" }, models }
    const spec = generateOpenApiSpec(platform)
    expect(spec.openapi).toBeTruthy()
    expect(spec.info.title).toBe("test")
    expect(spec.paths).toBeDefined()
  })
})

describe("monitor/health", () => {
  test("health check json", async () => {
    const { healthCheck } = await import("../src/core/monitor")
    const platform: any = { database: { run: () => {}, get: () => ({ cnt: 1 }) }, config: { name: "test" } }
    const result = healthCheck(platform)
    expect(result).toBeDefined()
    expect(result.status || result.message).toBeTruthy()
  })
})

describe("CSRF", () => {
  test("generate and validate token", async () => {
    const { generateCsrfToken, validateCsrfToken } = await import("../src/core/security/csrf")
    const sessionId = "test-session-123"
    const token = generateCsrfToken(sessionId)
    expect(token).toBeTruthy()
    expect(typeof token).toBe("string")
    expect(validateCsrfToken(sessionId, token)).toBe(true)
    expect(validateCsrfToken(sessionId, "invalid-token")).toBe(false)
    expect(validateCsrfToken("unknown-session", token)).toBe(false)
  })

  test("getCsrfToken returns null for unknown", async () => {
    const { getCsrfToken } = await import("../src/core/security/csrf")
    expect(getCsrfToken("nonexistent")).toBeNull()
  })
})

describe("captcha", () => {
  test("createCaptcha without provider config throws", async () => {
    const { createCaptcha } = await import("../src/core/captcha")
    expect(() => createCaptcha({} as any)).toThrow()
  })
})

describe("telemetry", () => {
  test("createTelemetry returns provider", async () => {
    const { createTelemetry } = await import("../src/core/telemetry")
    const t = createTelemetry({ exporter: "console" })
    expect(t).toBeDefined()
    expect(t.name).toBe("console")
  })
})

describe("UUID v7 edge cases", () => {
  test("generates in sequence without collision", () => {
    const { uuidv7 } = require("../src/core/uuid")
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7()))
    expect(ids.size).toBe(1000)
  })

  test("timestamp portion increases", () => {
    const { uuidv7 } = require("../src/core/uuid")
    const first = uuidv7().split("-")[0]
    const second = uuidv7().split("-")[0]
    expect(second.localeCompare(first)).toBeGreaterThanOrEqual(0)
  })
})

describe("YAML parser edge cases", () => {
  test("parse with missing file throws", () => {
    const { parseAppConfig } = require("../src/core/yaml")
    expect(() => parseAppConfig("/tmp/nonexistent-dir-xyz")).toThrow()
  })
})

describe("Actions loader", () => {
  test("loadActions from nonexistent dir returns empty", async () => {
    const { loadActions } = require("../src/core/actions")
    const actions = await loadActions("/tmp/nonexistent-dir-xyz")
    expect(actions).toEqual({})
  })
})
