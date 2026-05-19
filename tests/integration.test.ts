import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { createTestApp, req, json, registerUser } from "./setup"
import type { TestContext } from "./setup"

let ctx: TestContext
let adminToken: string
let viewerToken: string
let viewerId: string
let postId: string

beforeAll(async () => {
  ctx = await createTestApp()
})

afterAll(() => {
  ctx.cleanup()
})

function unwrap(res: any): any[] {
  return Array.isArray(res) ? res : (res.data || [])
}

describe("App startup", () => {
  test("app boots and responds", async () => {
    const res = await ctx.fetch(req("GET", "/api/health"))
    expect(res.status).toBe(200)
    const data = await json(res)
    expect(data.status).toBe("healthy")
  })
})

describe("Authentication", () => {
  test("register user", async () => {
    const res = await ctx.fetch(req("POST", "/api/auth/register", {
      name: "Test User",
      email: "test@example.com",
      password: "Password123!",
    }))
    expect(res.status).toBe(201)
    const data = await json(res)
    expect(data.token).toBeTruthy()
    expect(data.user.email).toBe("test@example.com")
    viewerToken = data.token
    viewerId = data.user.id
  })

  test("login with correct credentials", async () => {
    const res = await ctx.fetch(req("POST", "/api/auth/login", {
      email: "test@example.com",
      password: "Password123!",
    }))
    expect(res.status).toBe(200)
    const data = await json(res)
    expect(data.token).toBeTruthy()
  })

  test("login with wrong password", async () => {
    const res = await ctx.fetch(req("POST", "/api/auth/login", {
      email: "test@example.com",
      password: "wrongpassword",
    }))
    expect(res.status).toBe(401)
  })

  test("register admin user", async () => {
    const res = await ctx.fetch(req("POST", "/api/auth/register", {
      name: "Admin User",
      email: "admin@example.com",
      password: "Password123!",
      role: "admin",
    }))
    expect(res.status).toBe(201)
    const data = await json(res)
    adminToken = data.token
  })

  test("write route without token returns 401", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", { title: "test", content: "test" }))
    expect(res.status).toBe(401)
  })

  test("write route with invalid token returns 401", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", { title: "test", content: "test" }, "invalid-jwt"))
    expect(res.status).toBe(401)
  })
})

describe("CRUD: Posts", () => {
  test("create a post", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts", {
      title: "Test Post Title",
      content: "This is the content of the test post.",
      published: true,
      authorId: viewerId,
    }, viewerToken))
    expect(res.status).toBe(201)
    const data = await json(res)
    expect(data.id).toBeTruthy()
    postId = data.id
    expect(data.title).toBe("Test Post Title")
    expect(data.content).toBe("This is the content of the test post.")
    // SQLite returns booleans as 0/1; accept truthy
    // SQLite returns booleans as 1/0 (number), accept truthy values
    expect(data.published == true || data.published == 1 || data.published === "1" || data.published === "true").toBe(true)
    // views default of 0 comes back as 0 or "0" depending on column type
    expect(data.views == 0 || data.views === null).toBe(true)
  })

  test("list posts", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts", undefined, viewerToken))
    expect(res.status).toBe(200)
    const data = await json(res)
    const items = unwrap(data)
    expect(items.length).toBeGreaterThanOrEqual(1)
  })

  test("get single post", async () => {
    const res = await ctx.fetch(req("GET", `/api/posts/${postId}`, undefined, viewerToken))
    expect(res.status).toBe(200)
    const data = await json(res)
    expect(data.id).toBe(postId)
    expect(data.title).toBe("Test Post Title")
  })

  test("update own post", async () => {
    const res = await ctx.fetch(req("PUT", `/api/posts/${postId}`, {
      title: "Updated Title",
    }, viewerToken))
    expect(res.status).toBe(200)
    const data = await json(res)
    expect(data.title).toBe("Updated Title")
  })

  test("get non-existent post returns 404", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts/nonexistent-id", undefined, viewerToken))
    expect(res.status).toBe(404)
  })

  test("pagination returns valid structure", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts?page=1&limit=10", undefined, viewerToken))
    expect(res.status).toBe(200)
  })

  test("sort posts", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts?sort=title&order=asc", undefined, viewerToken))
    expect(res.status).toBe(200)
  })

  test("field filtering", async () => {
    const res = await ctx.fetch(req("GET", `/api/posts/${postId}?fields=title,id`, undefined, viewerToken))
    expect(res.status).toBe(200)
    const data = await json(res)
    expect(data.title).toBeTruthy()
    expect(data.id).toBeTruthy()
  })
})

describe("Soft Delete", () => {
  test("soft delete a post", async () => {
    const res = await ctx.fetch(req("DELETE", `/api/posts/${postId}`, undefined, adminToken))
    expect(res.status).toBe(200)
  })

  test("deleted post not in list", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts", undefined, viewerToken))
    const data = await json(res)
    const items = unwrap(data)
    const ids = items.map((p: any) => p.id)
    expect(ids).not.toContain(postId)
  })

  test("restore deleted post", async () => {
    const res = await ctx.fetch(req("POST", `/api/posts/${postId}/restore`, undefined, adminToken))
    expect(res.status).toBe(200)
  })

  test("restored post appears in list", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts", undefined, viewerToken))
    const data = await json(res)
    const items = unwrap(data)
    const ids = items.map((p: any) => p.id)
    expect(ids).toContain(postId)
  })
})

describe("RBAC", () => {
  test("viewer cannot delete another's post", async () => {
    const res = await ctx.fetch(req("DELETE", `/api/posts/${postId}`, undefined, viewerToken))
    expect(res.status).toBe(403)
  })

  test("admin can delete", async () => {
    const res = await ctx.fetch(req("DELETE", `/api/posts/${postId}`, undefined, adminToken))
    expect(res.status).toBe(200)
    // Restore for subsequent tests
    await ctx.fetch(req("POST", `/api/posts/${postId}/restore`, undefined, adminToken))
  })
})

describe("CRUD: Comments", () => {
  test("create a comment", async () => {
    const res = await ctx.fetch(req("POST", "/api/comments", {
      content: "Great post!",
      postId: postId,
    }, viewerToken))
    expect(res.status).toBe(201)
    const data = await json(res)
    expect(data.content).toBe("Great post!")
    expect(data.postId).toBe(postId)
  })
})

describe("Bulk operations", () => {
  test("bulk create", async () => {
    const res = await ctx.fetch(req("POST", "/api/posts/bulk", [
      { title: "Bulk Post 1", content: "Content 1" },
      { title: "Bulk Post 2", content: "Content 2" },
    ], adminToken))
    expect(res.status).toBe(201)
    const data = await json(res)
    expect(data.created).toBe(2)
  })
})

describe("Export", () => {
  test("export as JSON", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts/export?format=json", undefined, viewerToken))
    expect(res.status).toBe(200)
  })

  test("export as CSV", async () => {
    const res = await ctx.fetch(req("GET", "/api/posts/export?format=csv", undefined, viewerToken))
    expect(res.status).toBe(200)
  })
})

describe("Notifications", () => {
  test("list notifications", async () => {
    const res = await ctx.fetch(req("GET", "/api/notifications", undefined, viewerToken))
    expect(res.status).toBe(200)
    const data = await json(res)
    expect(data.notifications).toBeDefined()
    expect(typeof data.unread).toBe("number")
  })
})

describe("Feature flags", () => {
  test("create and toggle feature flag", async () => {
    const createRes = await ctx.fetch(req("POST", "/api/features", { key: "test-feature", name: "Test Feature", enabled: false }, adminToken))
    expect([200, 201]).toContain(createRes.status)

    const toggleRes = await ctx.fetch(req("PUT", "/api/features/test-feature/toggle", { enabled: true }, adminToken))
    expect(toggleRes.status).toBe(200)
  })
})

describe("Webhooks", () => {
  test("list webhooks", async () => {
    const res = await ctx.fetch(req("GET", "/api/webhooks", undefined, adminToken))
    expect(res.status).toBe(200)
  })
})

describe("Monitor", () => {
  test("health check", async () => {
    const res = await ctx.fetch(req("GET", "/api/health"))
    expect(res.status).toBe(200)
  })
})
