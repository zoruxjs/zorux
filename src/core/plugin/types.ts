import type { Hono } from "hono"
import type { AppConfig, CompiledModel } from "../types"
import type { PlatformAdapter } from "../platform"

export interface PluginConfig {
  [pluginName: string]: Record<string, any>
}

export interface KaiPlugin {
  name: string
  version?: string
  description?: string
  /** Plugins this plugin depends on (loaded first) */
  dependsOn?: string[]
  /** Modify the config before compilation */
  onConfig?: (config: AppConfig) => AppConfig | Promise<AppConfig>
  /** Add/modify models before compilation */
  onModel?: (models: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>
  /** Modify compiled models */
  onCompiledModel?: (models: CompiledModel[], config: AppConfig) => CompiledModel[] | Promise<CompiledModel[]>
  /** Modify DDL/schema before table creation */
  onSchema?: (schema: string, model: CompiledModel) => string | Promise<string>
  /** Register routes */
  onRoutes?: (app: Hono, platform: PlatformAdapter) => void | Promise<void>
  /** Register global middleware */
  onMiddleware?: (app: Hono) => void | Promise<void>
  /** Intercept DB queries */
  onDBQuery?: (query: { sql: string; params?: any[]; operation: string }) => { sql: string; params?: any[] } | Promise<{ sql: string; params?: any[] }>
  /** Handle errors */
  onError?: (error: Error, context: { request?: Request; model?: string }) => Response | Promise<Response> | void
  /** Called after server starts */
  onStart?: (platform: PlatformAdapter) => void | Promise<void>
  /** Called on shutdown */
  onShutdown?: () => void | Promise<void>
}

export interface PluginInstance {
  plugin: KaiPlugin
  config: Record<string, any>
  cleanup?: () => void | Promise<void>
}
