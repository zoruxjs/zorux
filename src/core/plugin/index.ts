import { readdirSync, existsSync, readFileSync } from "fs"
import { join } from "path"
import { Hono } from "hono"
import type { AppConfig } from "../types"
import type { PlatformAdapter } from "../platform"
import type { KaiPlugin, PluginInstance } from "./types"
import { tryLoadModule, adaptModule } from "./adapter"

export type { KaiPlugin, PluginInstance } from "./types"

export function getPluginConfig(platform: PlatformAdapter, pluginName: string): Record<string, any> {
  return (platform as any)._pluginConfig?.[pluginName] || {}
}

async function tryImport(name: string, rootDir: string): Promise<KaiPlugin | null> {
  return tryLoadModule(name, rootDir)
}

function resolveDeps(pluginMap: Map<string, KaiPlugin>): KaiPlugin[] {
  const visited = new Set<string>()
  const result: KaiPlugin[] = []
  function visit(name: string) {
    if (visited.has(name)) return
    visited.add(name)
    const plugin = pluginMap.get(name)
    if (!plugin) return
    if (plugin.dependsOn) {
      for (const dep of plugin.dependsOn) {
        if (!pluginMap.has(dep)) {
          console.warn("  [Zorux] Plugin '" + name + "' depends on missing plugin '" + dep + "'")
        }
        visit(dep)
      }
    }
    result.push(plugin)
  }
  for (const name of pluginMap.keys()) visit(name)
  return result
}

export async function loadPlugins(rootDir: string, config: AppConfig): Promise<KaiPlugin[]> {
  const pluginNames = config.plugins || []
  const found = new Map<string, KaiPlugin>()
  const pluginConfig = config.pluginConfig || {}

  for (const name of pluginNames) {
    const plugin = await tryImport(name, rootDir)
    if (plugin) {
      found.set(plugin.name, plugin)
      const cfg = pluginConfig[plugin.name]
      const desc = plugin.description ? " — " + plugin.description : ""
      console.log("  Plugin loaded: " + plugin.name + (plugin.version ? " v" + plugin.version : "") + desc + (cfg ? " (configured)" : ""))
    } else {
      console.warn("  [Zorux] Plugin '" + name + "' not found (tried: npm, plugins/" + name + ".ts)")
    }
  }

  // Resolve dependency order
  return resolveDeps(found)
}

export async function applyPluginConfig(config: AppConfig, plugins: KaiPlugin[]): Promise<AppConfig> {
  let cfg = { ...config }
  for (const plugin of plugins) {
    if (plugin.onConfig) {
      try {
        const result = await plugin.onConfig(cfg)
        if (result) cfg = result
      } catch (err: any) {
        console.warn("  [Zorux] Plugin '" + plugin.name + "' onConfig error: " + err.message)
      }
    }
  }
  return cfg
}

export async function applyPluginModels(models: Record<string, any>, plugins: KaiPlugin[]): Promise<Record<string, any>> {
  let m = { ...models }
  for (const plugin of plugins) {
    if (plugin.onModel) {
      try {
        const result = await plugin.onModel(m)
        if (result) m = result
      } catch (err: any) {
        console.warn("  [Zorux] Plugin '" + plugin.name + "' onModel error: " + err.message)
      }
    }
  }
  return m
}

export async function applyPluginCompiledModels(models: any[], config: AppConfig, plugins: KaiPlugin[]): Promise<any[]> {
  let m = [...models]
  for (const plugin of plugins) {
    if (plugin.onCompiledModel) {
      try {
        const result = await plugin.onCompiledModel(m, config)
        if (result) m = result
      } catch (err: any) {
        console.warn("  [Zorux] Plugin '" + plugin.name + "' onCompiledModel error: " + err.message)
      }
    }
  }
  return m
}

export async function applyPluginSchema(schema: string, model: any, plugins: KaiPlugin[]): Promise<string> {
  let s = schema
  for (const plugin of plugins) {
    if (plugin.onSchema) {
      try {
        const result = await plugin.onSchema(s, model)
        if (result) s = result
      } catch (err: any) {
        console.warn("  [Zorux] Plugin '" + plugin.name + "' onSchema error: " + err.message)
      }
    }
  }
  return s
}

export async function applyPluginMiddleware(app: Hono, plugins: KaiPlugin[]): Promise<void> {
  for (const plugin of plugins) {
    if (plugin.onMiddleware) {
      try {
        await plugin.onMiddleware(app)
      } catch (err: any) {
        console.warn("  [Zorux] Plugin '" + plugin.name + "' onMiddleware error: " + err.message)
      }
    }
  }
}

export async function applyPluginRoutes(app: Hono, platform: PlatformAdapter, plugins: KaiPlugin[]): Promise<void> {
  for (const plugin of plugins) {
    if (plugin.onRoutes) {
      try {
        await plugin.onRoutes(app, platform)
        console.log("  [Zorux] Plugin routes registered: " + plugin.name)
      } catch (err: any) {
        console.error("\n  [Zorux] Plugin '" + plugin.name + "' onRoutes ERROR: " + err.message)
        console.error("  [Zorux] Stack: " + (err.stack?.split("\n").slice(0, 3).join("\n  ") || "N/A"))
      }
    }
  }
}

export async function applyPluginStart(platform: PlatformAdapter, plugins: KaiPlugin[]): Promise<void> {
  for (const plugin of plugins) {
    if (plugin.onStart) {
      try {
        await plugin.onStart(platform)
      } catch (err: any) {
        console.warn("  [Zorux] Plugin '" + plugin.name + "' onStart error: " + err.message)
      }
    }
  }
}

export async function applyPluginShutdown(plugins: KaiPlugin[]): Promise<void> {
  for (const plugin of plugins) {
    if (plugin.onShutdown) {
      try {
        await plugin.onShutdown()
      } catch (err: any) {
        console.warn("  [Zorux] Plugin '" + plugin.name + "' onShutdown error: " + err.message)
      }
    }
  }
}

export function makePluginDBInterceptor(plugins: KaiPlugin[]): (query: { sql: string; params?: any[]; operation: string }) => { sql: string; params?: any[] } {
  return (query) => {
    let q = { ...query }
    for (const plugin of plugins) {
      if (plugin.onDBQuery) {
        try {
          const result = plugin.onDBQuery(q)
          if (result) q = result as any
        } catch (err: any) {
          console.warn("  [Zorux] Plugin '" + plugin.name + "' onDBQuery error: " + err.message)
        }
      }
    }
    return q
  }
}

export function makePluginErrorHandler(plugins: KaiPlugin[]): (error: Error, context?: { request?: Request; model?: string }) => Response | void {
  return (error, context) => {
    for (const plugin of plugins) {
      if (plugin.onError) {
        try {
          const result = plugin.onError(error, context || {})
          if (result instanceof Response) return result
          if (result && "then" in result) {
            result.catch(() => {})
          }
        } catch {}
      }
    }
  }
}

export function storePluginConfig(platform: PlatformAdapter, config: AppConfig): void {
  (platform as any)._pluginConfig = config.pluginConfig || {}
}
