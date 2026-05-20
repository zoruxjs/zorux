import { Hono } from "hono"

interface PluginDefinition {
  name: string
  version?: string
  description?: string
  ownsRoutes?: string[]
  readsModels?: string[]
  writesModels?: string[]
  env?: string[]
  onRoutes?: (app: Hono) => void | Promise<void>
  onStart?: () => void | Promise<void>
  onShutdown?: () => void | Promise<void>
}

export function definePlugin(def: PluginDefinition): PluginDefinition {
  if (!def.name) throw new Error("Plugin name is required")
  if (!def.onRoutes && !def.onStart) {
    console.warn(`[plugin:${def.name}] No onRoutes or onStart defined — plugin may be empty`)
  }
  return def
}

export type { PluginDefinition }
