import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { adaptModule, tryLoadModule } from "../src/core/plugin/adapter"
import type { KaiPlugin } from "../src/core/plugin"
import { Hono } from "hono"

describe("Native KaiPlugin detection", () => {
  test("detects valid KaiPlugin", () => {
    const plugin: KaiPlugin = {
      name: "my-plugin",
      version: "1.0.0",
      onRoutes: () => {},
    }
    const result = adaptModule(plugin, "my-plugin")
    expect(result).not.toBeNull()
    expect(result!.name).toBe("my-plugin")
    expect(result!.confidence).toBe(1)
    expect(result!.detail).toContain("KaiPlugin")
  })

  test("detects KaiPlugin with default export", () => {
    const mod = { default: { name: "wrapped", onStart: () => {} } }
    const result = adaptModule(mod, "wrapped")
    expect(result).not.toBeNull()
    expect(result!.name).toBe("wrapped")
    expect(result!.confidence).toBe(1)
  })

  test("rejects object without hooks", () => {
    const result = adaptModule({ name: "no-hooks" }, "no-hooks")
    expect(result).toBeNull()
  })
})

describe("Hono middleware detection", () => {
  test("detects (c, next) => void as Hono middleware", () => {
    const middleware = (c: any, next: any) => next()
    const result = adaptModule(middleware, "hono-middleware")
    expect(result).not.toBeNull()
    expect(result!.confidence).toBeGreaterThanOrEqual(0.9)
    expect(result!.detail).toContain("Hono middleware")
    expect(result!.plugin.onMiddleware).toBeDefined()
  })

  test("detects (c) => response as Hono handler", () => {
    const handler = (c: any) => c.json({ ok: true })
    const result = adaptModule(handler, "simple-handler")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("Hono middleware")
  })

  test("handles default export", () => {
    const mod = { default: (c: any, next: any) => next() }
    const result = adaptModule(mod, "default-export")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("Hono middleware")
  })
})

describe("Express middleware detection", () => {
  test("detects (req, res, next) => void as Express middleware", () => {
    const mw = (req: any, res: any, next: any) => next()
    const result = adaptModule(mw, "express-middleware")
    expect(result).not.toBeNull()
    expect(result!.confidence).toBeGreaterThanOrEqual(0.8)
    expect(result!.detail).toContain("Express middleware")
  })

  test("onMiddleware registers via hono/compat", async () => {
    let called = false
    const mw = (req: any, res: any, next: any) => { called = true; next() }
    const result = adaptModule(mw, "test-express")
    expect(result).not.toBeNull()

    const app = new Hono()
    if (result?.plugin.onMiddleware) {
      await result.plugin.onMiddleware(app)
    }
    // Verify it registers without crashing
    expect(called).toBe(false) // middleware not called until a request hits
  })
})

describe("Express Router detection", () => {
  test("detects Express Router via stack property", () => {
    const router = (() => {
      const r: any = (req: any, res: any, next: any) => next()
      r.stack = []
      r.use = () => r
      r.get = () => r
      r.post = () => r
      return r
    })()
    const result = adaptModule(router, "express-router")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("Express Router")
  })
})

describe("Express app detection", () => {
  test("detects Express app via use + get/post methods", () => {
    const app = { use: () => {}, get: () => {}, post: () => {} }
    const result = adaptModule(app, "express-app")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("Express app")
  })
})

describe("Passport Strategy detection", () => {
  test("detects class with authenticate method", () => {
    class MockStrategy {
      name = "mock"
      authenticate() {}
    }
    const result = adaptModule(MockStrategy, "passport-mock")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("Passport Strategy")
  })

  test("detects class with Strategy in name", () => {
    class MyCustomStrategy {}
    const result = adaptModule(MyCustomStrategy, "@some/passport-strategy")
    expect(result).not.toBeNull()
  })
})

describe("install/setup/init hooks", () => {
  test("detects install() method", () => {
    const mod = { install: () => {} }
    const result = adaptModule(mod, "with-install")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("install()")
    expect(result!.plugin.onStart).toBeDefined()
  })

  test("detects setup() method", () => {
    const mod = { setup: () => {} }
    const result = adaptModule(mod, "with-setup")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("setup()")
  })

  test("detects init() method", () => {
    const mod = { init: () => {} }
    const result = adaptModule(mod, "with-init")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("init()")
  })
})

describe("Namespace object middleware", () => {
  test("detects object with createMiddleware export", () => {
    const mod = {
      createMiddleware: () => (c: any, next: any) => next(),
      somethingElse: "data",
    }
    const result = adaptModule(mod, "namespace-pkg")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("namespace with middleware")
  })
})

describe("Priority ordering", () => {
  test("KaiPlugin wins over Hono middleware", () => {
    // A callable object that passes both as middleware AND a KaiPlugin
    function hybrid(c: any, next: any) { return next() }
    hybrid.onRoutes = () => {}
    const result = adaptModule(hybrid, "hybrid")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("KaiPlugin")
    expect(result!.confidence).toBe(1)
  })

  test("Hono middleware beats Express middleware for 2-arg functions", () => {
    const fn = (c: any, next: any) => next()
    const result = adaptModule(fn, "ambiguous")
    expect(result).not.toBeNull()
    expect(result!.detail).toContain("Hono middleware")
    expect(result!.confidence).toBeGreaterThan(0.8)
  })
})

describe("Edge cases", () => {
  test("null module returns null", () => {
    expect(adaptModule(null, "null")).toBeNull()
  })

  test("undefined module returns null", () => {
    expect(adaptModule(undefined, "undefined")).toBeNull()
  })

  test("string module returns null", () => {
    expect(adaptModule("hello", "string")).toBeNull()
  })

  test("number module returns null", () => {
    expect(adaptModule(42, "number")).toBeNull()
  })

  test("array module returns null", () => {
    expect(adaptModule([1, 2, 3], "array")).toBeNull()
  })

  test("empty object returns null", () => {
    expect(adaptModule({}, "empty")).toBeNull()
  })
})

describe("Integration with tryLoadModule", () => {
  test("temp dir fallback does not crash", async () => {
    // tryLoadModule on a non-existent package should return null, not throw
    const result = await tryLoadModule("non-existent-package-xyz", "/tmp")
    expect(result).toBeNull()
  })
})
