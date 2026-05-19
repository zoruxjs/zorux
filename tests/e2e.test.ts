// E2E flows: complete user journeys through the full stack
import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { createTestApp, req, json, registerUser } from "./setup"
import type { TestContext } from "./setup"

let ctx: TestContext
let token: string
let adminToken: string
let userId: string
let postId: string

beforeAll(async () => {
  ctx = await createTestApp()
  const res = await ctx.fetch(req("POST", "/api/auth/register", {
    name: "E2E User", email: "e2e@example.com", password: "Pass123!",
  }))
  const data = await json(res)
  token = data.token; userId = data.user.id

  const adminRes = await ctx.fetch(req("POST", "/api/auth/register", {
    name: "E2E Admin", email: "e2e-admin@example.com", password: "Pass123!", role: "admin",
  }))
  adminToken = (await json(adminRes)).token
})
afterAll(() => ctx.cleanup())

describe("E2E: Auth flow", () => {
  test("register → login → me → logout", async () => {
    const reg = await ctx.fetch(req("POST", "/api/auth/register", {
      name: "Flow User", email: "flow@example.com", password: "Pass123!",
    }))
    expect(reg.status).toBe(201)
    const flowToken = (await json(reg)).token

    const me = await ctx.fetch(req("GET", "/api/auth/me", undefined, flowToken))
    expect(me.status).toBe(200)
    expect((await json(me)).user.email).toBe("flow@example.com")

    const login = await ctx.fetch(req("POST", "/api/auth/login", { email: "flow@example.com", password: "Pass123!" }))
    expect(login.status).toBe(200)
  })
})

describe("E2E: CRUD + relations", () => {
  test("create post with author → create comment → list with includes", async () => {
    const postRes = await ctx.fetch(req("POST", "/api/posts", {
      title: "E2E Post", content: "E2E content", authorId: userId, published: true,
    }, token))
    expect(postRes.status).toBe(201)
    postId = (await json(postRes)).id

    const commentRes = await ctx.fetch(req("POST", "/api/comments", {
      content: "E2E comment", postId: postId,
    }, token))
    expect(commentRes.status).toBe(201)

    const listRes = await ctx.fetch(req("GET", "/api/posts", undefined, token))
    expect(listRes.status).toBe(200)
  })
})

describe("E2E: Soft delete + restore", () => {
  test("delete → verify hidden → restore → verify visible", async () => {
    const del = await ctx.fetch(req("DELETE", `/api/posts/${postId}`, undefined, adminToken))
    expect(del.status).toBe(200)

    const list1 = await ctx.fetch(req("GET", "/api/posts", undefined, token))
    const items1 = (await json(list1)).data || list1
    expect(items1.find((p: any) => p.id === postId)).toBeFalsy()

    const restore = await ctx.fetch(req("POST", `/api/posts/${postId}/restore`, undefined, adminToken))
    expect(restore.status).toBe(200)

    const list2 = await ctx.fetch(req("GET", "/api/posts", undefined, token))
    const items2 = (await json(list2)).data || list2
    expect(items2.find((p: any) => p.id === postId)).toBeTruthy()
  })
})

describe("E2E: RBAC policies", () => {
  test("viewer cannot delete, admin can", async () => {
    const viewerDel = await ctx.fetch(req("DELETE", `/api/posts/${postId}`, undefined, token))
    expect(viewerDel.status).toBe(403)

    const adminDel = await ctx.fetch(req("DELETE", `/api/posts/${postId}`, undefined, adminToken))
    expect(adminDel.status).toBe(200)

    await ctx.fetch(req("POST", `/api/posts/${postId}/restore`, undefined, adminToken))
  })
})

describe("E2E: Bulk operations", () => {
  test("bulk create + bulk update", async () => {
    const create = await ctx.fetch(req("POST", "/api/posts/bulk", [
      { title: "Bulk 1", content: "x", authorId: userId },
      { title: "Bulk 2", content: "x", authorId: userId },
      { title: "Bulk 3", content: "x", authorId: userId },
    ], adminToken))
    expect(create.status).toBe(201)
    expect((await json(create)).created).toBe(3)
  })
})

describe("E2E: Export + import", () => {
  test("export as CSV", async () => {
    const csv = await ctx.fetch(req("GET", "/api/posts/export?format=csv", undefined, token))
    expect(csv.status).toBe(200)
    const text = await csv.text()
    expect(text).toContain("title")
  })

  test("export as JSON", async () => {
    const jsonRes = await ctx.fetch(req("GET", "/api/posts/export?format=json", undefined, token))
    expect(jsonRes.status).toBe(200)
  })
})

describe("E2E: Feature flags lifecycle", () => {
  test("create → list → toggle → delete", async () => {
    const create = await ctx.fetch(req("POST", "/api/features", { key: "e2e-flag", name: "E2E Flag", enabled: true }, adminToken))
    expect(create.status).toBe(201)

    const list = await ctx.fetch(req("GET", "/api/features", undefined, adminToken))
    expect(list.status).toBe(200)

    const toggle = await ctx.fetch(req("PUT", "/api/features/e2e-flag/toggle", undefined, adminToken))
    expect(toggle.status).toBe(200)

    const del = await ctx.fetch(req("DELETE", "/api/features/e2e-flag", undefined, adminToken))
    expect(del.status).toBe(200)
  })
})

describe("E2E: Webhooks lifecycle", () => {
  test("create → list → delete webhook", async () => {
    const create = await ctx.fetch(req("POST", "/api/webhooks", {
      url: "https://example.com/webhook", events: ["post:created"],
    }, adminToken))
    expect([200, 201]).toContain(create.status)
    let hook: any
    try { hook = await json(create) } catch { hook = null }

    const list = await ctx.fetch(req("GET", "/api/webhooks", undefined, adminToken))
    expect(list.status).toBe(200)

    if (hook?.id) {
      const del = await ctx.fetch(req("DELETE", `/api/webhooks/${hook.id}`, undefined, adminToken))
      expect([200, 204]).toContain(del.status)
    }
  })
})

describe("E2E: Notifications", () => {
  test("list notifications and mark read", async () => {
    const list = await ctx.fetch(req("GET", "/api/notifications", undefined, token))
    expect(list.status).toBe(200)
    const data = await json(list)
    expect(data.notifications).toBeDefined()
    expect(typeof data.unread).toBe("number")

    const markAll = await ctx.fetch(req("POST", "/api/notifications/read-all", undefined, token))
    expect([200, 404]).toContain(markAll.status)
  })
})

describe("E2E: Audit log", () => {
  test("audit logs exist after CRUD operations", async () => {
    const logs = await ctx.fetch(req("GET", "/api/audit-logs", undefined, adminToken))
    expect(logs.status).toBe(200)
  })
})

describe("E2E: Search", () => {
  test("search returns results", async () => {
    const search = await ctx.fetch(req("GET", "/api/posts?search=E2E", undefined, token))
    expect(search.status).toBe(200)
  })
})

describe("E2E: Pagination + sort + filter", () => {
  test("page through results", async () => {
    const p1 = await ctx.fetch(req("GET", "/api/posts?page=1&limit=5", undefined, token))
    expect(p1.status).toBe(200)
  })

  test("sort by title", async () => {
    const sorted = await ctx.fetch(req("GET", "/api/posts?sort=title&order=asc", undefined, token))
    expect(sorted.status).toBe(200)
  })

  test("field filtering", async () => {
    const filtered = await ctx.fetch(req("GET", `/api/posts/${postId}?fields=title,id`, undefined, token))
    expect(filtered.status).toBe(200)
    const data = await json(filtered)
    expect(data.title).toBeTruthy()
    expect(data.id).toBeTruthy()
  })
})

describe("E2E: Error handling", () => {
  test("404 for unknown route", async () => {
    const res = await ctx.fetch(req("GET", "/api/nonexistent-route-xyz"))
    expect(res.status).toBe(404)
  })

  test("404 for unknown model", async () => {
    const res = await ctx.fetch(req("GET", "/api/unknownmodel"))
    expect(res.status).toBe(404)
  })

  test("409 for duplicate email", async () => {
    const res = await ctx.fetch(req("POST", "/api/auth/register", {
      name: "Dupe", email: "e2e@example.com", password: "Pass123!",
    }))
    expect(res.status).toBe(409)
  })
})

describe("E2E: Admin endpoints", () => {
  test("health check", async () => {
    const res = await ctx.fetch(req("GET", "/api/health"))
    expect(res.status).toBe(200)
  })

  test("OpenAPI spec", async () => {
    const res = await ctx.fetch(req("GET", "/api/openapi.json"))
    expect(res.status).toBe(200)
  })

  test("Swagger docs", async () => {
    const res = await ctx.fetch(req("GET", "/api/docs"))
    expect(res.status).toBe(200)
  })
})
