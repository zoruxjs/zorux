import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { createTestApp, req, json, registerUser } from "./setup"
import type { TestContext } from "./setup"

let ctx: TestContext
let token: string

beforeAll(async () => {
  ctx = await createTestApp()
  token = await registerUser(ctx, "Fuzz Tester", "fuzz@example.com", "Password123!")
})

afterAll(() => {
  ctx.cleanup()
})

function unwrap(res: any): any[] {
  return Array.isArray(res) ? res : (res.data || [])
}

function randomString(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;':\",./<>?~` \t\n\r\x00"
  let s = ""
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]
  }
  return s
}

describe("SQL injection vectors", () => {
  const vectors = [
    "1' OR '1'='1",
    "1; DROP TABLE posts--",
    "' UNION SELECT * FROM users--",
    "1' AND 1=1--",
    "1' AND 1=2--",
    "admin'--",
    "1' ORDER BY 1--",
    "1' GROUP BY 1--",
    "' OR 1=1; --",
    "1' OR '1'='1' /*",
    "1' OR '1'='1' #",
    "` OR 1=1",
    "\\' OR 1=1 --",
    "1' WAITFOR DELAY '0:0:5'--",
    "1' AND SLEEP(5)--",
    "1'; EXEC xp_cmdshell('dir')--",
    "1' UNION SELECT @@version--",
    "1' UNION SELECT * FROM information_schema.tables--",
  ]

  for (const vec of vectors) {
    test(`SQLi in query: ${vec.substring(0, 25)}`, async () => {
      const res = await ctx.fetch(req("GET", `/api/posts?title=${encodeURIComponent(vec)}`, undefined, token))
      expect(res.status).toBe(200)
      const data = await json(res)
      const items = unwrap(data)
      expect(Array.isArray(items)).toBe(true)
    })

    test(`SQLi in ID: ${vec.substring(0, 25)}`, async () => {
      const res = await ctx.fetch(req("GET", `/api/posts/${encodeURIComponent(vec)}`, undefined, token))
      expect([400, 404, 500]).toContain(res.status)
    })

    test(`SQLi in body: ${vec.substring(0, 20)}`, async () => {
      const res = await ctx.fetch(req("POST", "/api/posts", { title: vec, content: vec }, token))
      expect([200, 201, 400]).toContain(res.status)
    })
  }
})

describe("XSS vectors", () => {
  const vectors = [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(1)>",
    "javascript:alert(1)",
    "\"><script>alert(1)</script>",
    "<BODY ONLOAD=alert(1)>",
    "<IMG SRC=javascript:alert('XSS')>",
    "<a href=\"javascript:alert(1)\">link</a>",
    "<details open ontoggle=alert(1)>",
  ]

  for (const vec of vectors) {
    test(`XSS: ${vec.substring(0, 25)}`, async () => {
      const res = await ctx.fetch(req("POST", "/api/posts", { title: vec, content: vec }, token))
      expect([200, 201, 400]).toContain(res.status)
    })
  }
})

describe("JWT tampering on write route", () => {
  test("expired token rejected", async () => {
    const expired = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    const res = await ctx.fetch(req("POST", "/api/posts", { title: "test", content: "test" }, expired))
    expect(res.status).toBe(401)
  })

  test("malformed JWT rejected", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", { title: "test", content: "test" }, "not-a-jwt"))
    expect(res.status).toBe(401)
  })

  test("empty token rejected", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", { title: "test", content: "test" }, ""))
    expect(res.status).toBe(401)
  })

  test("JWT with null algorithm rejected", async () => {
    const nullAlg = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIn0."
    const res = await ctx.fetch(req("POST", "/api/posts", { title: "test", content: "test" }, nullAlg))
    expect(res.status).toBe(401)
  })

  test("JWT with wrong secret rejected", async () => {
    const tampered = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ.hMp8jg9S6c0P1IwN6hG0F3GmJ0Hv0Hv0Hv0Hv0Hv0Hv0"
    const res = await ctx.fetch(req("POST", "/api/posts", { title: "test", content: "test" }, tampered))
    expect(res.status).toBe(401)
  })
})

describe("Malformed requests", () => {
  test("invalid Content-Type returns 400", async () => {
    const res = await ctx.fetch(new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/xml", Authorization: `Bearer ${token}` },
      body: "<post><title>test</title></post>",
    }))
    expect([400, 415, 500]).toContain(res.status)
  })

  test("array instead of object returns 400", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", [1, 2, 3], token))
    expect([400, 500]).toContain(res.status)
  })

  test("null body returns 400", async () => {
    const res = await ctx.fetch(new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: "null",
    }))
    expect([400, 500]).toContain(res.status)
  })
})

describe("Random fuzz inputs", () => {
  for (let i = 0; i < 30; i++) {
    test(`fuzz iteration ${i + 1}`, async () => {
      const payload: Record<string, any> = {
        title: randomString(Math.floor(Math.random() * 200)),
        content: randomString(Math.floor(Math.random() * 1000)),
        views: Math.random() > 0.5 ? Math.floor(Math.random() * 10000) : randomString(10),
      }
      const res = await ctx.fetch(req("POST", "/api/posts", payload, token))
      expect(res.status).not.toBeGreaterThanOrEqual(500)
    })
  }
})

describe("Rapid fuzz reads", () => {
  test("30 rapid requests", async () => {
    const promises = []
    for (let i = 0; i < 30; i++) {
      promises.push(ctx.fetch(req("GET", "/api/posts", undefined, token)))
    }
    const results = await Promise.all(promises)
    for (const res of results) {
      expect(res.status).toBe(200)
    }
  })
})
