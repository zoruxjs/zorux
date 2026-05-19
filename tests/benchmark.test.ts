import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { createTestApp, req, json, registerUser } from "./setup"
import type { TestContext } from "./setup"

let ctx: TestContext
let token: string
let adminToken: string

// Clear rate limiter between benchmarks
async function clearRateLimiter() {
  try {
    const { clearRateLimiter } = await import("../src/core/security")
    clearRateLimiter()
  } catch {}
}

beforeAll(async () => {
  ctx = await createTestApp()
  token = await registerUser(ctx, "Bench User", "bench@example.com", "Password123!")
  const adminRes = await ctx.fetch(req("POST", "/api/auth/register", {
    name: "Bench Admin", email: "bench-admin@example.com", password: "Password123!", role: "admin",
  }))
  adminToken = (await json(adminRes)).token

  // Seed data
  for (let i = 0; i < 20; i++) {
    await ctx.fetch(req("POST", "/api/posts", {
      title: `Bench Post ${i}`, content: "x".repeat(100), authorId: 1,
    }, token))
  }
})

afterAll(() => ctx.cleanup())

async function bench(label: string, fn: () => Promise<Response>, expected: number, iterations = 100): Promise<number> {
  // Warmup
  for (let i = 0; i < 5; i++) await fn()

  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    const res = await fn()
    if (res.status !== expected) throw new Error(`${label}: expected ${expected}, got ${res.status}`)
  }
  const elapsed = performance.now() - start
  const avg = elapsed / iterations
  const ops = Math.round(1000 / avg)
  return ops
}

describe("Benchmarks", () => {
  const iterations = { read: 200, write: 50, login: 10, concurrent: 50 }

  test("GET /api/health", async () => {
    await clearRateLimiter()
    let last: number
    try {
      last = await bench("health", () => ctx.fetch(req("GET", "/api/health")), 200, 50)
    } catch {
      await clearRateLimiter()
      last = await bench("health", () => ctx.fetch(req("GET", "/api/health")), 200, 30)
    }
    console.log(`  GET /api/health:           ${last.toString().padStart(5)} ops/s`)
    expect(last).toBeGreaterThan(1500)
  })

  test("GET /api/posts (list 20)", async () => {
    const ops = await bench("list", () => ctx.fetch(req("GET", "/api/posts", undefined, token)), 200, iterations.read)
    console.log(`  GET /api/posts (list 20):  ${ops.toString().padStart(5)} ops/s`)
    expect(ops).toBeGreaterThan(1500)
  })

  test("GET /api/posts/:id (single)", async () => {
    const ops = await bench("single", () => ctx.fetch(req("GET", "/api/posts/1", undefined, token)), 200, iterations.read)
    console.log(`  GET /api/posts/:id:        ${ops.toString().padStart(5)} ops/s`)
    expect(ops).toBeGreaterThan(3000)
  })

  test("POST /api/posts (create)", async () => {
    const ops = await bench("create", () => ctx.fetch(req("POST", "/api/posts", {
      title: "Bench", content: "x".repeat(50), authorId: 1,
    }, token)), 201, iterations.write)
    console.log(`  POST /api/posts (create):  ${ops.toString().padStart(5)} ops/s`)
    expect(ops).toBeGreaterThan(800)
  })

  test("PUT /api/posts/:id (update)", async () => {
    const ops = await bench("update", () => ctx.fetch(req("PUT", "/api/posts/1", { title: "Updated" }, adminToken)), 200, iterations.write)
    console.log(`  PUT /api/posts/:id:        ${ops.toString().padStart(5)} ops/s`)
    expect(ops).toBeGreaterThan(1000)
  })

  test("DELETE /api/posts/:id (soft delete)", async () => {
    const ops = await bench("delete", () => ctx.fetch(req("DELETE", "/api/posts/2", undefined, adminToken)), 200, iterations.write)
    console.log(`  DELETE /api/posts/:id:     ${ops.toString().padStart(5)} ops/s`)
    // Restore for subsequent runs
    await ctx.fetch(req("POST", "/api/posts/2/restore", undefined, adminToken))
    expect(ops).toBeGreaterThan(1000)
  })

  test("POST /api/auth/login (cached)", async () => {
    // First login warms the cache
    await ctx.fetch(req("POST", "/api/auth/login", { email: "bench@example.com", password: "Password123!" }))
    const ops = await bench("login", () => ctx.fetch(req("POST", "/api/auth/login", { email: "bench@example.com", password: "Password123!" })), 200, iterations.login)
    console.log(`  POST /api/auth/login:      ${ops.toString().padStart(5)} ops/s`)
    expect(ops).toBeGreaterThan(1000)
  })

  test("POST /api/auth/register", async () => {
    // Register unique users sequentially
    let counter = 0
    const ops = await bench("register", () => {
      counter++
      return ctx.fetch(req("POST", "/api/auth/register", {
        name: `Bench Reg ${counter}`, email: `benchreg${counter}@example.com`, password: "Password123!",
      }))
    }, 201, 5)
    console.log(`  POST /api/auth/register:   ${ops.toString().padStart(5)} ops/s`)
    expect(ops).toBeGreaterThan(3) // bcrypt is slow
  })

  test("50 concurrent GETs throughput", async () => {
    await clearRateLimiter()
    const start = performance.now()
    const promises = Array.from({ length: 50 }, (_, i) => ctx.fetch(req("GET", "/api/posts", undefined, token)))
    const results = await Promise.all(promises)
    const elapsed = performance.now() - start
    const ops = Math.round(50 / (elapsed / 1000))
    console.log(`  50 concurrent GETs:         ${ops.toString().padStart(5)} req/s`)
    for (const res of results) expect(res.status).toBe(200)
    expect(ops).toBeGreaterThan(2000)
  })

  test("50 concurrent mixed requests", async () => {
    const start = performance.now()
    let counter = 0
    const promises = Array.from({ length: 50 }, (_, i) => {
      counter++
      return i % 5 === 0
        ? ctx.fetch(req("POST", "/api/posts", { title: `Mixed ${counter}`, content: "x", authorId: 1 }, token))
        : ctx.fetch(req("GET", "/api/posts", undefined, token))
    })
    const results = await Promise.all(promises)
    const elapsed = performance.now() - start
    const totalReqs = 50
    const ops = Math.round(totalReqs / (elapsed / 1000))
    console.log(`  50 concurrent mixed:        ${ops.toString().padStart(5)} req/s`)
    const ok = results.filter(r => r.status === 200 || r.status === 201).length
    expect(ok).toBeGreaterThanOrEqual(45)
    expect(ops).toBeGreaterThan(1000)
  })
})
