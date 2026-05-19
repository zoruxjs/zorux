import { describe, test, expect, beforeEach } from "bun:test"
import { securityHeaders, rateLimiter, bodySizeLimit, clearRateLimiter } from "../src/core/security"

function mockCtx(ip = "127.0.0.1", method = "GET", contentLength?: number) {
  const headers: Record<string, string> = {}
  return {
    req: {
      method,
      header: (name: string) => {
        if (name.toLowerCase() === "x-forwarded-for") return ip
        if (name.toLowerCase() === "content-length") return contentLength?.toString() || "0"
        return headers[name.toLowerCase()] || ""
      },
    },
    header: (name: string, value: string) => { headers[name] = value },
    json: (data: any, status?: number) => new Response(JSON.stringify(data), { status }),
  }
}

describe("securityHeaders", () => {
  test("calls header() for each security header", () => {
    const ctx = mockCtx()
    const called: string[] = []
    ctx.header = (name: string) => { called.push(name) }
    const result = securityHeaders(ctx, () => undefined)
    expect(called.length).toBeGreaterThanOrEqual(4)
    expect(called).toContain("X-Content-Type-Options")
    expect(called).toContain("X-Frame-Options")
    expect(called).toContain("Content-Security-Policy")
  })
})

describe("rateLimiter", () => {
  beforeEach(() => clearRateLimiter())

  test("allows requests under limit", () => {
    const limiter = rateLimiter({ maxRequests: 5 })
    let called = false
    const result = limiter(mockCtx("10.0.0.1"), () => { called = true })
    expect(called).toBe(true)
    expect(result).toBeUndefined()
  })

  test("blocks over limit", () => {
    const limiter = rateLimiter({ maxRequests: 2 })
    for (let i = 0; i < 2; i++) limiter(mockCtx("10.0.0.2"), () => {})
    const result = limiter(mockCtx("10.0.0.2"), () => {})
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(429)
  })

  test("different IPs have separate limits", () => {
    const limiter = rateLimiter({ maxRequests: 1 })
    limiter(mockCtx("10.0.0.3"), () => {})
    let called = false
    const result = limiter(mockCtx("10.0.0.4"), () => { called = true })
    expect(called).toBe(true)
  })
})

describe("bodySizeLimit", () => {
  test("allows small body", () => {
    const limiter = bodySizeLimit(1000)
    let called = false
    const result = limiter(mockCtx("127.0.0.1", "POST", 100), () => { called = true })
    expect(called).toBe(true)
    expect(result).toBeUndefined()
  })

  test("blocks large body", () => {
    const limiter = bodySizeLimit(100)
    const result = limiter(mockCtx("127.0.0.1", "POST", 500), () => {})
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(413)
  })

  test("allows GET requests regardless", () => {
    const limiter = bodySizeLimit(1)
    let called = false
    const result = limiter(mockCtx("127.0.0.1", "GET"), () => { called = true })
    expect(called).toBe(true)
  })
})
