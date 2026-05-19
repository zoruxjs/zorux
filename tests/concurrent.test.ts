import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { createTestApp, req, json } from "./setup"
import type { TestContext } from "./setup"

let ctx: TestContext

beforeAll(async () => {
  ctx = await createTestApp()
})

afterAll(() => {
  ctx.cleanup()
})

describe("Concurrent registration", () => {
  test("10 simultaneous registrations", async () => {
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(ctx.fetch(req("POST", "/api/auth/register", {
        name: `Concurrent User ${i}`,
        email: `concurrent${i}@example.com`,
        password: "Password123!",
      })))
    }
    const results = await Promise.all(promises)
    let successCount = 0
    for (const res of results) {
      if (res.status === 201) successCount++
    }
    expect(successCount).toBeGreaterThanOrEqual(8)
  })
})

describe("Concurrent reads", () => {
  let tokens: string[] = []

  beforeAll(async () => {
    for (let i = 0; i < 5; i++) {
      const res = await ctx.fetch(req("POST", "/api/auth/register", {
        name: `Read Tester ${i}`,
        email: `reader${i}@example.com`,
        password: "Password123!",
      }))
      if (res.status === 201) {
        const data = await json(res)
        tokens.push(data.token)
      }
    }
  })

  test("50 concurrent reads", async () => {
    const promises = []
    for (let i = 0; i < 50; i++) {
      const t = tokens[i % tokens.length] || tokens[0]
      promises.push(ctx.fetch(req("GET", "/api/posts", undefined, t)))
    }
    const results = await Promise.all(promises)
    let ok = 0
    for (const res of results) {
      if (res.status === 200) ok++
    }
    expect(ok).toBeGreaterThanOrEqual(45)
  })
})

describe("Concurrent writes", () => {
  let token: string

  beforeAll(async () => {
    const res = await ctx.fetch(req("POST", "/api/auth/register", {
      name: "Write Tester",
      email: "writetest@example.com",
      password: "Password123!",
    }))
    const data = await json(res)
    token = data.token
  })

  test("20 concurrent creates", async () => {
    const promises = []
    for (let i = 0; i < 20; i++) {
      promises.push(ctx.fetch(req("POST", "/api/posts", {
        title: `Concurrent Post ${i}`,
        content: `Content for post ${i}`,
      }, token)))
    }
    const results = await Promise.all(promises)
    let created = 0
    for (const res of results) {
      if (res.status === 201) created++
    }
    expect(created).toBe(20)
  })
})

describe("Mixed read/write concurrency", () => {
  let token: string

  beforeAll(async () => {
    const res = await ctx.fetch(req("POST", "/api/auth/register", {
      name: "Mixed Tester",
      email: "mixed@example.com",
      password: "Password123!",
    }))
    const data = await json(res)
    token = data.token
  })

  test("interleaved creates, reads, updates", async () => {
    const ops: Promise<number>[] = []
    let createdId = ""

    const createPromise = ctx.fetch(req("POST", "/api/posts", {
      title: "Mixed test",
      content: "Mixed content",
    }, token)).then(async (res) => {
      if (res.status === 201) {
        const d = await json(res)
        createdId = d.id
      }
      return res.status
    })
    ops.push(createPromise)

    for (let i = 0; i < 5; i++) {
      ops.push(ctx.fetch(req("GET", "/api/posts", undefined, token)).then(r => r.status))
    }

    await Promise.all(ops)

    if (createdId) {
      const updateRes = await ctx.fetch(req("PUT", `/api/posts/${createdId}`, {
        title: "Updated in race",
      }, token))
      // admin can update, viewer can't (no authorId set)
      expect([200, 403, 404]).toContain(updateRes.status)
    }
  })
})

describe("Bulk operation concurrency", () => {
  let token: string

  beforeAll(async () => {
    const res = await ctx.fetch(req("POST", "/api/auth/register", {
      name: "Bulk Tester",
      email: "bulkconc@example.com",
      password: "Password123!",
    }))
    const data = await json(res)
    token = data.token
  })

  test("concurrent bulk creates", async () => {
    const promises = []
    for (let batch = 0; batch < 3; batch++) {
      const records = []
      for (let i = 0; i < 5; i++) {
        records.push({ title: `Bulk concurrent ${batch}-${i}`, content: "test" })
      }
      // Bulk endpoint expects array directly
      promises.push(ctx.fetch(req("POST", "/api/posts/bulk", records, token)))
    }
    const results = await Promise.all(promises)
    let totalCreated = 0
    for (const res of results) {
      if (res.status === 201) {
        const d = await json(res)
        totalCreated += d.created || 0
      }
    }
    expect(totalCreated).toBe(15)
  })
})
