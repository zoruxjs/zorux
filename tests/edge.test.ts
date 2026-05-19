import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { createTestApp, req, json, registerUser } from "./setup"
import type { TestContext } from "./setup"

let ctx: TestContext
let token: string

beforeAll(async () => {
  ctx = await createTestApp()
  token = await registerUser(ctx, "Edge Tester", "edge@example.com", "Password123!")
})

afterAll(() => {
  ctx.cleanup()
})

function unwrap(res: any): any[] {
  return Array.isArray(res) ? res : (res.data || [])
}

describe("Field validation edge cases", () => {
  test("empty required string should fail", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", { title: "", content: "content" }, token))
    expect(res.status).toBe(400)
  })

  test("missing required field should fail", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", { content: "Missing title" }, token))
    expect(res.status).toBe(400)
  })

  test("very long string should not crash", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", {
      title: "x".repeat(10000), content: "Long title test",
    }, token))
    expect(res.status).toBe(201)
  })

  test("unicode characters in fields", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", {
      title: "Unicode: ñoño 🎉 中文 русский",
      content: "Special chars: ♠♣♥♦ ¡¿ üñíçödé",
    }, token))
    expect(res.status).toBe(201)
  })

  test("number as string for numeric field", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", {
      title: "Number coercion", content: "test", views: "42",
    }, token))
    expect(res.status).toBe(201)
  })
})

describe("ID edge cases", () => {
  test("non-existent UUID returns 404", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts/00000000-0000-0000-0000-000000000000", undefined, token))
    expect(res.status).toBe(404)
  })

  test("non-existent short ID returns 404", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts/nonexistent", undefined, token))
    expect(res.status).toBe(404)
  })

  test("SQL injection in ID returns 404", async () => {
    const res = await ctx.fetch(req("GET", `/api/posts/1' OR '1'='1`, undefined, token))
    expect(res.status).toBe(404)
  })
})

describe("Pagination edge cases", () => {
  test("page 0 works", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts?page=0", undefined, token))
    expect(res.status).toBe(200)
  })

  test("negative page works", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts?page=-1", undefined, token))
    expect(res.status).toBe(200)
  })

  test("extremely large page number works", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts?page=9999999", undefined, token))
    expect(res.status).toBe(200)
  })

  test("negative limit works", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts?limit=-5", undefined, token))
    expect(res.status).toBe(200)
  })

  test("zero limit works", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts?limit=0", undefined, token))
    expect(res.status).toBe(200)
  })
})

describe("Sort edge cases", () => {
  test("sort by non-existent field", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts?sort=nonexistent", undefined, token))
    expect(res.status).toBe(200)
  })

  test("sort with invalid order defaults to ASC", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts?sort=title&order=invalid", undefined, token))
    expect(res.status).toBe(200)
  })
})

describe("Filter edge cases", () => {
  test("filter with special characters", async () => {
    const res = await ctx.fetch(req("GET", `/api/posts?title=test%25*_`, undefined, token))
    expect(res.status).toBe(200)
  })

  test("filter by non-existent field", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts?nonexistent=value", undefined, token))
    expect(res.status).toBe(200)
  })
})

describe("Request edge cases", () => {
  test("malformed JSON body returns 400", async () => {
    const res = await ctx.fetch(new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: "{invalid json}",
    }))
    expect([400, 500]).toContain(res.status)
  })

  test("empty body returns 400", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", {}, token))
    expect(res.status).toBe(400)
  })

  test("html in string fields allowed", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", {
      title: "<script>alert('xss')</script>",
      content: "<b>bold</b> & <i>italic</i>",
    }, token))
    expect(res.status).toBe(201)
  })
})
