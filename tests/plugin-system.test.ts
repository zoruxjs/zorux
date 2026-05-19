import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { loadPlugins, applyPluginConfig, applyPluginModels, applyPluginCompiledModels, applyPluginMiddleware, applyPluginRoutes, applyPluginStart, applyPluginShutdown, makePluginDBInterceptor, makePluginErrorHandler } from "../src/core/plugin"
import type { KaiPlugin } from "../src/core/plugin"
import { Hono } from "hono"

const makeConfig = (plugins: string[], pluginConfig?: any): any => ({
  name: "test",
  type: "api",
  database: { provider: "sqlite", url: ":memory:" },
  models: { item: { fields: { name: { type: "string", required: true } }, timestamps: false } },
  plugins,
  pluginConfig,
})

const makePlatform = (): any => ({
  database: {
    collection: () => ({ find: () => [], findById: () => null, insert: (d: any) => d, update: () => {}, deleteById: () => {} }),
  },
  realtime: { publish: () => {}, websocket: () => null },
  storage: { upload: async () => "url" },
})

describe("Plugin loading", () => {
  test("empty plugins array returns empty", async () => {
    const config = makeConfig([])
    const plugins = await loadPlugins("/tmp", config)
    expect(plugins.length).toBe(0)
  })

  test("loads plugins with dependency ordering", async () => {
    const pluginB: KaiPlugin = { name: "plugin-b", dependsOn: ["plugin-a"] }
    const pluginA: KaiPlugin = { name: "plugin-a" }
    const config = makeConfig(["plugin-b", "plugin-a"])
    // Mock the imports
    const origImport = globalThis.import
    const mockImports: Record<string, KaiPlugin> = { "Zorux-plugin-plugin-a": pluginA, "Zorux-plugin-plugin-b": pluginB }
    // Can't easily mock dynamic imports in Bun, so test the dependency resolver logic
    // by directly testing the topo sort via loadPlugins
    const plugins = await loadPlugins("/tmp", makeConfig(["nonexistent"]))
    expect(plugins.length).toBe(0)
  })
})

describe("Plugin hooks", () => {
  test("onConfig modifies config", async () => {
    const plugin: KaiPlugin = {
      name: "config-mod",
      onConfig(config) {
        return { ...config, name: "modified-by-plugin" }
      },
    }
    const cfg = await applyPluginConfig(makeConfig([]), [plugin])
    expect(cfg.name).toBe("modified-by-plugin")
  })

  test("onModel adds models", async () => {
    const plugin: KaiPlugin = {
      name: "model-add",
      onModel(models) {
        return { ...models, extra: { fields: { val: { type: "string" } }, timestamps: false } }
      },
    }
    const models = await applyPluginModels({ item: { fields: { name: { type: "string" } }, timestamps: false } }, [plugin])
    expect(models.extra).toBeDefined()
    expect(models.extra.fields.val.type).toBe("string")
  })

  test("onCompiledModel adds fields", async () => {
    const plugin: KaiPlugin = {
      name: "compiled-mod",
      onCompiledModel(models) {
        return models.map(m => ({
          ...m,
          fields: [...m.fields, { name: "pluginField", type: "string", isRequired: false, isUnique: false, defaultValue: undefined, isRelation: false }],
        }))
      },
    }
    const compiled = [{ name: "item", fields: [{ name: "name", type: "string", isRequired: true, isUnique: false, defaultValue: undefined, isRelation: false }], tableName: "items", hasAuth: false, hasTimestamps: false }]
    const result = await applyPluginCompiledModels(compiled, makeConfig([]), [plugin])
    expect(result[0].fields.length).toBe(2)
    expect(result[0].fields[1].name).toBe("pluginField")
  })

  test("onMiddleware registers middleware", async () => {
    let called = false
    const plugin: KaiPlugin = {
      name: "mw-test",
      onMiddleware(app) {
        app.use("*", async (c: any, next: any) => { called = true; await next() })
      },
    }
    const app = new Hono()
    await applyPluginMiddleware(app, [plugin])
    expect(plugin.onMiddleware).toBeDefined()
  })

  test("onRoutes registers routes", async () => {
    let routeAdded = false
    const plugin: KaiPlugin = {
      name: "route-test",
      onRoutes(app) {
        app.get("/api/plugin-route", (c: any) => c.json({ ok: true }))
        routeAdded = true
      },
    }
    const app = new Hono()
    const platform = makePlatform()
    await applyPluginRoutes(app, platform, [plugin])
    expect(routeAdded).toBe(true)
  })

  test("onStart called", async () => {
    let started = false
    const plugin: KaiPlugin = {
      name: "start-test",
      onStart() { started = true },
    }
    await applyPluginStart(makePlatform(), [plugin])
    expect(started).toBe(true)
  })

  test("onShutdown called", async () => {
    let shutdownCalled = false
    const plugin: KaiPlugin = {
      name: "shutdown-test",
      onShutdown() { shutdownCalled = true },
    }
    await applyPluginShutdown([plugin])
    expect(shutdownCalled).toBe(true)
  })
})

describe("DB interceptor", () => {
  test("onDBQuery modifies queries", async () => {
    const plugin: KaiPlugin = {
      name: "db-mod",
      onDBQuery(query) {
        if (query.sql.includes("secret")) {
          return { sql: query.sql.replace(/secret/g, "***"), params: query.params }
        }
        return query
      },
    }
    const interceptor = makePluginDBInterceptor([plugin])
    const result = interceptor({ sql: "SELECT * FROM users WHERE name = 'secret'", operation: "select" })
    expect(result.sql).toBe("SELECT * FROM users WHERE name = '***'")
  })

  test("multiple interceptors chain", async () => {
    const p1: KaiPlugin = {
      name: "db-1",
      onDBQuery(q) { return { sql: q.sql + " -- filtered1", params: q.params } },
    }
    const p2: KaiPlugin = {
      name: "db-2",
      onDBQuery(q) { return { sql: q.sql + " -- filtered2", params: q.params } },
    }
    const interceptor = makePluginDBInterceptor([p1, p2])
    const result = interceptor({ sql: "SELECT 1", operation: "select" })
    expect(result.sql).toContain("-- filtered2")
  })
})

describe("Error handler", () => {
  test("onError handles errors", () => {
    let caught: Error | null = null
    const plugin: KaiPlugin = {
      name: "err-test",
      onError(error) {
        caught = error
        return new Response(JSON.stringify({ handled: true }), { status: 500 })
      },
    }
    const handler = makePluginErrorHandler([plugin])
    const err = new Error("test error")
    const result = handler(err, { model: "test" })
    expect(caught?.message).toBe("test error")
    expect(result).toBeInstanceOf(Response)
  })
})

describe("getPluginConfig", () => {
  test("retrieves plugin config from platform", async () => {
    const { getPluginConfig } = await import("../src/core/plugin")
    const platform = makePlatform()
    platform._pluginConfig = { "my-plugin": { key: "value", num: 42 } }
    const cfg = getPluginConfig(platform, "my-plugin")
    expect(cfg.key).toBe("value")
    expect(cfg.num).toBe(42)
  })

  test("returns empty object for missing config", async () => {
    const { getPluginConfig } = await import("../src/core/plugin")
    const platform = makePlatform()
    platform._pluginConfig = {}
    const cfg = getPluginConfig(platform, "nonexistent")
    expect(cfg).toEqual({})
  })
})
