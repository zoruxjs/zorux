import { Hono } from "hono"
import type { KaiPlugin } from "./types"

// ── Result type ──

export interface AdapterMatch {
  name: string
  plugin: KaiPlugin
  confidence: number
  detail: string
}

// ── Adapter pipeline ──

type Adapter = (mod: any, name: string) => AdapterMatch | null

function isObj(v: any): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v)
}

function fnLen(fn: any): number | null {
  return typeof fn === "function" ? fn.length : null
}

function defaultOrSelf(mod: any): any {
  return mod?.default && mod.default !== mod ? mod.default : mod
}

function safe(fn: () => any): any {
  try { return fn() } catch { return undefined }
}

// ── Adapter implementations ──

const adapters: Adapter[] = [
  // 1. Already a KaiPlugin
  (mod, name) => {
    const p = mod.default || mod
    if (p?.name && typeof p.name === "string" && (typeof p.onRoutes === "function" || typeof p.onStart === "function" || typeof p.onMiddleware === "function" || typeof p.onConfig === "function")) {
      return { name: p.name, plugin: p, confidence: 1, detail: "native KaiPlugin" }
    }
    return null
  },

  // 2. Hono middleware (c, next) => void
  (mod, name) => {
    const fn = defaultOrSelf(mod)
    const len = fnLen(fn)
    if (len !== null && len <= 2) {
      // Exclude Express middleware (3 args)
      const p: KaiPlugin = {
        name,
        description: `Hono middleware (auto-detected)`,
        onMiddleware: (app: Hono) => {
          app.use("*", fn)
        },
      }
      return { name, plugin: p, confidence: len === 2 ? 0.95 : 0.6, detail: "Hono middleware" }
    }
    return null
  },

  // 3. Express middleware (req, res, next) => void
  (mod, name) => {
    const fn = defaultOrSelf(mod)
    if (fnLen(fn) === 3) {
      const p: KaiPlugin = {
        name,
        description: `Express middleware (auto-detected via hono/compat)`,
        onMiddleware: async (app: Hono) => {
          try {
            const { express } = await import("hono/compat")
            app.use("*", express(fn))
          } catch {
            // Fallback: try raw
            app.use("*", fn as any)
          }
        },
      }
      return { name, plugin: p, confidence: 0.85, detail: "Express middleware" }
    }
    return null
  },

  // 4. Express Router (has stack, is a function with routes)
  (mod, name) => {
    const router = mod.default || mod
    if (typeof router === "function" && router.stack && typeof router.stack === "object" && router.stack.length !== undefined) {
      const p: KaiPlugin = {
        name,
        description: `Express Router (auto-detected via hono/compat)`,
        onMiddleware: async (app: Hono) => {
          try {
            const { express } = await import("hono/compat")
            app.use("*", express(router))
          } catch {
            app.use("*", router as any)
          }
        },
      }
      return { name, plugin: p, confidence: 0.9, detail: "Express Router" }
    }
    return null
  },

  // 5. Express app (has use/get/post methods)
  (mod, name) => {
    const app = mod.default || mod
    if (isObj(app) && typeof app.use === "function" && (typeof app.get === "function" || typeof app.post === "function")) {
      const p: KaiPlugin = {
        name,
        description: `Express app (auto-detected via hono/compat)`,
        onMiddleware: async (app: Hono) => {
          try {
            const { express } = await import("hono/compat")
            app.use("*", express(app))
          } catch {
            app.use("*", app as any)
          }
        },
      }
      return { name, plugin: p, confidence: 0.8, detail: "Express app" }
    }
    return null
  },

  // 6. Passport strategy (class/constructor with name and authenticate)
  (mod, name) => {
    const Strategy = mod.default || mod
    if (typeof Strategy === "function" && (Strategy.prototype?.authenticate || Strategy.name?.toLowerCase().includes("strategy"))) {
      const p: KaiPlugin = {
        name,
        description: `Passport Strategy`,
      }
      return { name, plugin: p, confidence: 0.7, detail: "Passport Strategy" }
    }
    return null
  },

  // 7. Object with install() — Pluggable pattern (VuePress/Vite/etc)
  (mod, name) => {
    const obj = mod.default || mod
    if (isObj(obj) && typeof obj.install === "function") {
      const p: KaiPlugin = {
        name,
        description: `Plugin with install() hook`,
        onStart: async (platform: any) => {
          try {
            await obj.install(platform)
          } catch (err: any) {
            console.warn(`  [Zorux] Plugin '${name}' install() failed: ${err.message}`)
          }
        },
      }
      return { name, plugin: p, confidence: 0.65, detail: "install() hook" }
    }
    return null
  },

  // 8. Object with setup() / init() / register()
  (mod, name) => {
    const obj = mod.default || mod
    if (isObj(obj)) {
      const hook = obj.setup || obj.init || obj.register
      if (typeof hook === "function") {
        const p: KaiPlugin = {
          name,
          description: `Plugin with ${hook.name}() hook`,
          onStart: async (platform: any) => {
            try {
              await hook.call(obj, platform)
            } catch (err: any) {
              console.warn(`  [Zorux] Plugin '${name}' ${hook.name}() failed: ${err.message}`)
            }
          },
        }
        return { name, plugin: p, confidence: 0.6, detail: `${hook.name}() hook` }
      }
    }
    return null
  },

  // 9. Koa middleware (ctx, next) => void — similar to Hono but koa ctx has different shape
  (mod, name) => {
    const fn = defaultOrSelf(mod)
    const len = fnLen(fn)
    if (len === 2) {
      // Could be Hono or Koa; Hono handler already caught above (len <= 2)
      // Koa middleware needs adaption; try it
      const p: KaiPlugin = {
        name,
        description: `Koa-style middleware (auto-detected)`,
        onMiddleware: (app: Hono) => {
          app.use("*", async (c: any, next: any) => {
            try {
              await fn(c, next)
            } catch (err: any) {
              console.warn(`  [Zorux] Koa middleware '${name}' failed: ${err.message}`)
            }
          })
        },
      }
      return { name, plugin: p, confidence: 0.4, detail: "Koa middleware (speculative)" }
    }
    return null
  },

  // 10. Fastify plugin (fastify, opts, done) => void
  (mod, name) => {
    const fn = defaultOrSelf(mod)
    const len = fnLen(fn)
    if (len === 3) {
      // Express middleware already caught; Fastify plugins have same arity
      // Check if it looks more like Fastify (name convention)
      if (name.includes("fastify") || name.includes("fastify-")) {
        const p: KaiPlugin = {
          name,
          description: `Fastify plugin (auto-detected)`,
          onStart: async () => {
            console.warn(`  [Zorux] Fastify plugin '${name}' not compatible with Hono-based Zorux`)
          },
        }
        return { name, plugin: p, confidence: 0.3, detail: "Fastify plugin (not compatible)" }
      }
    }
    return null
  },

  // 11. namespace object with multiple middleware/utilities
  (mod, name) => {
    const obj = defaultOrSelf(mod)
    if (isObj(obj)) {
      const mwKeys = Object.keys(obj).filter(k => typeof obj[k] === "function" && (k.startsWith("http") || k.startsWith("create") || k.includes("Middleware") || k.includes("middleware")))
      if (mwKeys.length > 0) {
        const p: KaiPlugin = {
          name,
          description: `Module with middleware exports: ${mwKeys.join(", ")}`,
          onMiddleware: (app: Hono) => {
            for (const key of mwKeys) {
              try {
                app.use("*", obj[key])
              } catch (err: any) {
                console.warn(`  [Zorux] Plugin '${name}' middleware '${key}' failed: ${err.message}`)
              }
            }
          },
        }
        return { name, plugin: p, confidence: 0.5, detail: "namespace with middleware" }
      }
    }
    return null
  },

  // 12. Class constructor — instantiate with config from pluginConfig
  (mod, name) => {
    const Klass = mod.default || mod
    if (typeof Klass === "function" && Klass.prototype && Object.getOwnPropertyNames(Klass.prototype).length > 1) {
      const p: KaiPlugin = {
        name,
        description: `Class (instantiated with config)`,
        onMiddleware: async (app: Hono) => {
          try {
            const instance = new Klass()
            if (typeof instance.handle === "function") {
              app.use("*", instance.handle.bind(instance))
            } else if (typeof instance.middleware === "function") {
              app.use("*", instance.middleware.bind(instance))
            }
          } catch (err: any) {
            console.warn(`  [Zorux] Plugin '${name}' class instantiation failed: ${err.message}`)
          }
        },
      }
      return { name, plugin: p, confidence: 0.35, detail: "class (speculative)" }
    }
    return null
  },
]

// ── Main adapter function ──

export function adaptModule(mod: any, name: string): AdapterMatch | null {
  const results: AdapterMatch[] = []

  for (const adapter of adapters) {
    try {
      const result = adapter(mod, name)
      if (result) results.push(result)
    } catch {
      // Adapter itself failed; skip
    }
  }

  if (results.length === 0) return null

  // Sort by confidence descending, pick best
  results.sort((a, b) => b.confidence - a.confidence)
  return results[0]
}

// ── Module loader with adaption ──

export async function tryLoadModule(name: string, rootDir: string): Promise<KaiPlugin | null> {
  // Try direct import
  for (const candidate of [
    name,
    name.startsWith("Zorux-plugin-") ? null : "Zorux-plugin-" + name,
  ].filter(Boolean)) {
    try {
      const mod = await import(candidate!)
      const adapted = adaptModule(mod, name)
      if (adapted) return adapted.plugin
    } catch {}
  }

  // Try local plugins/
  const { existsSync } = await import("fs")
  const { join } = await import("path")
  for (const localPath of [
    join(rootDir, "plugins", name + ".ts"),
    join(rootDir, "plugins", name, "index.ts"),
  ]) {
    if (existsSync(localPath)) {
      try {
        const absPath = (Bun as any).pathToFileURL(localPath).href
        const mod = await import(absPath)
        const adapted = adaptModule(mod, name)
        if (adapted) return adapted.plugin
      } catch {}
    }
  }

  return null
}
