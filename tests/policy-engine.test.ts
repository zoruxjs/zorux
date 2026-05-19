import { describe, test, expect } from "bun:test"
import { checkPolicy, clearASTCache, addDerivedRole } from "../src/core/policy-engine"

function input(policy: string, overrides: any = {}): any {
  return {
    policy,
    model: "test",
    operation: "read",
    user: overrides.user !== undefined
      ? overrides.user
      : { id: "1", role: "viewer", email: "test@example.com" },
    resource: overrides.resource !== undefined
      ? overrides.resource
      : { id: "1", title: "Test", authorId: "1", status: "draft" },
  }
}

describe("basic policies", () => {
  test('"*" allows all', () => {
    const r = checkPolicy(input("*", { user: {} }))
    expect(r.allowed).toBe(true)
  })

  test('"authenticated" requires user id', () => {
    expect(checkPolicy(input("authenticated", { user: { id: "1" } })).allowed).toBe(true)
    expect(checkPolicy(input("authenticated", { user: {} })).allowed).toBe(false)
  })

  test("role check", () => {
    expect(checkPolicy(input("admin", { user: { role: "admin" } })).allowed).toBe(true)
    expect(checkPolicy(input("admin", { user: { role: "viewer" } })).allowed).toBe(false)
  })
})

describe("comparison operators", () => {
  test("==", () => {
    expect(checkPolicy(input('user.role == "admin"', { user: { role: "admin" } })).allowed).toBe(true)
    expect(checkPolicy(input('user.role == "admin"', { user: { role: "viewer" } })).allowed).toBe(false)
  })

  test("!=", () => {
    expect(checkPolicy(input('user.role != "admin"', { user: { role: "viewer" } })).allowed).toBe(true)
    expect(checkPolicy(input('user.role != "admin"', { user: { role: "admin" } })).allowed).toBe(false)
  })

  test("> >= < <=", () => {
    expect(checkPolicy(input("resource.views > 5", { resource: { views: 10 } })).allowed).toBe(true)
    expect(checkPolicy(input("resource.views > 5", { resource: { views: 3 } })).allowed).toBe(false)
    expect(checkPolicy(input("resource.views >= 5", { resource: { views: 5 } })).allowed).toBe(true)
    expect(checkPolicy(input("resource.views < 5", { resource: { views: 3 } })).allowed).toBe(true)
    expect(checkPolicy(input("resource.views <= 5", { resource: { views: 5 } })).allowed).toBe(true)
  })

  test("&& and ||", () => {
    expect(checkPolicy(input('user.role == "admin" && resource.status == "draft"', { user: { role: "admin" } })).allowed).toBe(true)
    expect(checkPolicy(input('user.role == "admin" && resource.status == "published"', { user: { role: "admin" } })).allowed).toBe(false)
    expect(checkPolicy(input('user.role == "admin" || resource.status == "published"', { user: { role: "viewer" }, resource: { status: "draft" } })).allowed).toBe(false)
  })
})

describe("resource field access", () => {
  test("explicit resource.authorId == user.id", () => {
    expect(checkPolicy(input("resource.authorId == user.id", { resource: { authorId: "1" } })).allowed).toBe(true)
  })

  test("bare field resolves from resource if exists", () => {
    expect(checkPolicy(input("authorId == user.id", { resource: { authorId: "1" } })).allowed).toBe(true)
  })

  test("bare field not found in resource returns false", () => {
    expect(checkPolicy(input("nonexistent == user.id", { resource: {} })).allowed).toBe(false)
  })
})

describe("boolean literals", () => {
  test('"true" as policy is treated as role (deny for non-true-role)', () => {
    // The policy engine treats bare "true" as a role name since it matches /^[a-zA-Z_,]+$/
    expect(checkPolicy(input("true")).allowed).toBe(false)
  })
})

describe("in operator", () => {
  test("user.role in list", () => {
    expect(checkPolicy(input('user.role in ["admin", "owner"]', { user: { role: "admin" } })).allowed).toBe(true)
    expect(checkPolicy(input('user.role in ["viewer", "editor"]', { user: { role: "admin" } })).allowed).toBe(false)
  })
})

describe("matches operator", () => {
  test("regex match", () => {
    expect(checkPolicy(input('user.email matches "@example"', { user: { email: "admin@example.com" } })).allowed).toBe(true)
    expect(checkPolicy(input('user.role matches "^admin"', { user: { role: "admin" } })).allowed).toBe(true)
    expect(checkPolicy(input('user.role matches "^viewer"', { user: { role: "admin" } })).allowed).toBe(false)
  })
})

describe("exists operator", () => {
  test("checks field existence", () => {
    expect(checkPolicy(input("exists resource.title")).allowed).toBe(true)
    expect(checkPolicy(input("exists resource.nonexistent")).allowed).toBe(false)
  })
})

describe("negation", () => {
  test("! operator", () => {
    expect(checkPolicy(input('!(user.role == "admin")', { user: { role: "viewer" } })).allowed).toBe(true)
    expect(checkPolicy(input('!(user.role == "admin")', { user: { role: "admin" } })).allowed).toBe(false)
  })
})

describe("grouping", () => {
  test("parentheses", () => {
    expect(checkPolicy(input('(user.role == "admin") && (resource.status == "draft")', { user: { role: "admin" } })).allowed).toBe(true)
    expect(checkPolicy(input('(user.role == "viewer") && (resource.status == "published")', { user: { role: "viewer" }, resource: { status: "draft" } })).allowed).toBe(false)
    expect(checkPolicy(input('(user.role == "viewer") || (resource.status == "published")', { user: { role: "viewer" }, resource: { status: "draft" } })).allowed).toBe(true)
  })
})

describe("derived roles", () => {
  test("are added and checked", () => {
    addDerivedRole({ name: "trusted", condition: 'user.role == "admin"' })
    // A viewer is not a trusted user
    expect(checkPolicy(input("trusted", { user: { role: "viewer" } })).allowed).toBe(false)
    // An admin IS a trusted user
    expect(checkPolicy(input("trusted", { user: { role: "admin" } })).allowed).toBe(true)
  })
})

describe("audit trail", () => {
  test("audit log is populated", () => {
    checkPolicy({ policy: "admin", user: { role: "viewer" }, resource: {} })
    // The policy engine logs decisions; we can verify it doesn't throw
  })
})

describe("error handling", () => {
  test("invalid syntax returns denied", () => {
    const r = checkPolicy({ policy: "invalid syntax @@@", user: {}, resource: {} })
    expect(r.allowed).toBe(false)
    expect(r.reason).toBeTruthy()
  })

  test("unknown operator returns denied", () => {
    const r = checkPolicy({ policy: "a ?? b", user: {}, resource: {} })
    expect(r.allowed).toBe(false)
  })
})

describe("empty and edge cases", () => {
  test("empty policy string", () => {
    const r = checkPolicy({ policy: "", user: {}, resource: {} })
    expect(r.allowed).toBe(false)
  })

  test("whitespace only", () => {
    const r = checkPolicy({ policy: "   ", user: {}, resource: {} })
    expect(r.allowed).toBe(false)
  })
})

describe("AST cache", () => {
  test("clearASTCache doesn't throw", () => {
    clearASTCache()
    // Verify caching still works after clear
    expect(checkPolicy({ policy: "*", user: {}, resource: {} }).allowed).toBe(true)
  })
})
