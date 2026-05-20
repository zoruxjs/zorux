import { join } from "path"
import { existsSync } from "fs"
import { parseAppConfig } from "./yaml"
import { getVersion } from "./version"
import { compileModels } from "./compiler"
import { createPlatform } from "./platform"
import { createRouter } from "./router"
import { loadActions } from "./actions"
import { loadPlugins, applyPluginConfig, applyPluginModels, applyPluginCompiledModels, applyPluginMiddleware, applyPluginRoutes, applyPluginStart, applyPluginShutdown, storePluginConfig } from "./plugin"
import { loadJobs, createJobsTable, startWorker, getRegisteredJobs, submitJob } from "./jobs"
import { createEmailProvider } from "./email"
import { securityHeaders, rateLimiter, bodySizeLimit } from "./security"
import { initI18n, i18nMiddleware } from "./i18n"
import { createCache, cacheMiddleware, invalidateModelCache, getCache } from "./cache"
import { registerSocialAuth } from "./social-auth"
import { registerAdvancedAuth } from "./advanced-auth"
import { registerOrgRoutes, orgMiddleware } from "./org"
import { registerWebAuthn } from "./advanced-auth/webauthn"
import { registerOAuthProvider } from "./oauth-provider"
import { createPaymentProvider, registerPaymentRoutes, getPaymentProvider } from "./payments"
import { createCaptcha, registerCaptchaRoutes, getCaptcha } from "./captcha"
import { createTelemetry, telemetryMiddleware, metricsEndpoint } from "./telemetry"
import { createGraphQLHandler } from "./graphql"
import { registerWebhookRoutes } from "./webhooks"
import { registerNotificationRoutes } from "./notifications"
import { createSearchProvider, registerSearchRoutes, indexModelRecord, removeModelIndex } from "./search"
import { registerMonitorRoutes } from "./monitor"
import { registerFeatureRoutes } from "./features"
import { registerAuditRoutes } from "./audit"

export interface AppInstance {
  fetch: (req: Request) => Promise<Response>
  start: (port?: number) => void
  _app?: any // Access to underlying Hono app (for dev tools)
}

export async function createApp(rootDir: string): Promise<AppInstance> {
  let config = parseAppConfig(rootDir)

  // Load plugins
  const plugins = await loadPlugins(rootDir, config)
  config = await applyPluginConfig(config, plugins)

  // Allow plugins to add/modify models before compilation
  const rawModels = await applyPluginModels(config.models, plugins)
  const compiledModels = compileModels(rawModels, config.auth?.model)
  // Allow plugins to modify compiled models
  const models = await applyPluginCompiledModels(compiledModels, config, plugins)

  const platform = await createPlatform(config, models)
  // Store plugin config on platform for runtime access
  storePluginConfig(platform, config)
  const actionsDir = join(rootDir, "actions")
  const actions = await loadActions(actionsDir)
  // Create app
  const app = createRouter(platform, actions, rootDir)

  // Verify org middleware works with a test route
  if ((config as any).auth?.organization?.enabled) {
    app.use("*", orgMiddleware(platform.database))
    console.log("  Org: scoping enabled")
  }

  // Register social auth routes
  const socialSchema = { adapter: platform.database, provider: config.database?.provider || "sqlite" }
  registerSocialAuth(app, config, socialSchema as any, models)

  // Register advanced auth (password reset, email verification, magic link, OTP, API keys, 2FA)
  registerAdvancedAuth(app, config, socialSchema as any, models)

  // Register organization/teams routes
  registerOrgRoutes(app, config, socialSchema as any, models)

  // Register WebAuthn/Passkey routes
  registerWebAuthn(app, config, socialSchema as any, models)

  // Register OAuth Provider (IdP)
  registerOAuthProvider(app, config, socialSchema as any, models)

  // Initialize captcha
  const captchaProvider = process.env.CAPTCHA_PROVIDER || (config as any).captcha?.provider
  if (captchaProvider) {
    try {
      createCaptcha({ provider: captchaProvider })
      registerCaptchaRoutes(app)
      console.log("  Captcha: " + captchaProvider)
    } catch (err: any) {
      console.log("  Captcha: " + err.message)
    }
  }

  // Initialize payments
  const paymentsProvider = process.env.PAYMENTS_PROVIDER || (config as any).payments?.provider
  if (paymentsProvider) {
    try {
      createPaymentProvider({ provider: paymentsProvider })
      registerPaymentRoutes(app, config, platform)
      console.log("  Payments: " + paymentsProvider)
    } catch (err: any) {
      console.log("  Payments: " + err.message)
    }
  }

  // Plugin middleware
  await applyPluginMiddleware(app, plugins)

  // Apply security middleware
  app.use("*", securityHeaders)
  app.use("*", rateLimiter({ maxRequests: 200 }))
  app.use("*", bodySizeLimit())

  // Initialize cache
  const cacheCfg = (config as any).cache
  const cache = cacheCfg ? createCache({ provider: cacheCfg.provider, url: cacheCfg.url, ttl: cacheCfg.ttl }) : createCache()
  if (cacheCfg) {
    app.use("*", cacheMiddleware(cache, cacheCfg.ttl || 60))
    // Invalidate cache on write operations
    app.use(async (c: any, next: any) => {
      await next()
      if (["POST", "PUT", "DELETE"].includes(c.req.method)) {
        await invalidateModelCache(cache, "")
      }
    })
    console.log("  Cache: " + cache.name + (cacheCfg.ttl ? " (TTL: " + cacheCfg.ttl + "s)" : ""))
  }

  // Initialize telemetry
  const telemetryExporter = process.env.TELEMETRY_EXPORTER || (config as any).telemetry?.exporter
  if (telemetryExporter) {
    const exporter = createTelemetry({ exporter: telemetryExporter })
    app.use("*", telemetryMiddleware(exporter))
    app.get("/api/metrics", metricsEndpoint())
    console.log("  Telemetry: " + exporter.name)
  }

  // Initialize i18n
  const i18nCfg = (config as any).i18n
  if (i18nCfg) {
    initI18n(rootDir, { defaultLocale: i18nCfg.defaultLocale, locales: i18nCfg.locales })
    app.use("*", i18nMiddleware)
    console.log("  i18n: " + (i18nCfg.locales || ["en"]).join(", "))
  }

  // GraphQL endpoint
  try {
    const gqlHandler = createGraphQLHandler(platform.models, platform.database)
    app.post("/api/graphql", gqlHandler)
    app.get("/api/graphql", gqlHandler)
    console.log("  GraphQL: /api/graphql")
  } catch (err: any) {
    console.log("  GraphQL: " + err.message + " (install: npm install graphql)")
  }

  // Webhook management routes
  registerWebhookRoutes(app, config, socialSchema as any, models)

  // Notification routes
  registerNotificationRoutes(app, config, socialSchema as any, models)

  // Monitor routes (health + metrics)
  registerMonitorRoutes(app, platform)

  // Feature flags routes
  registerFeatureRoutes(app, config, socialSchema as any, models)

  // Audit log routes
  registerAuditRoutes(app, config, socialSchema as any, models)

  // Initialize search engine
  const searchProviderConfig = process.env.SEARCH_PROVIDER || (config as any).search?.provider
  if (searchProviderConfig) {
    try {
      createSearchProvider({ provider: searchProviderConfig })
      registerSearchRoutes(app, models)
      console.log("  Search: " + searchProviderConfig)
    } catch (err: any) {
      console.log("  Search: " + err.message)
    }
  }

  // Web admin routes (can be overridden by plugins)
  if (config.type === "web" || config.type === "fullstack") {
    try {
      const { createWebRouter } = await import("../views/pages/web-router")
      await createWebRouter(platform, app)
    } catch {}
  }

  // Auto-load web/pages/*.tsx by convention (file-based routing)
  const webPagesDir = join(rootDir, "web", "pages")
  if (existsSync(webPagesDir)) {
    try {
      const { readdirSync } = await import("fs")
      const files = readdirSync(webPagesDir).filter(f => f.endsWith(".tsx") || f.endsWith(".ts"))
      for (const file of files) {
        const name = file.replace(/\.(tsx|ts)$/, "")
        const routeName = name === "index" ? "" : name
        const route = "/" + routeName
        const mod = await import(join(webPagesDir, file))
        const Component = Object.values(mod)[0] as any
        if (typeof Component === "function") {
          app.get(route, (c) => c.html(Component({ appName: config.name || "Zorux" })))
        }
      }
    } catch (e) {
      // web/pages/ exists but couldn't load pages — non-fatal
    }
  }

  // Register declarative forms
  if (config.forms) {
    try {
      const { registerForms } = await import("./forms")
      registerForms(app, config.forms, config)
    } catch (e) {
      // forms config exists but couldn't register — non-fatal
    }
  }

  // Apply plugin routes (registered last so they can override admin routes)
  await applyPluginRoutes(app, platform, plugins)

  // Plugin startup hook
  await applyPluginStart(platform, plugins)

  // Debug: list all registered routes
  if (process.env.NODE_ENV !== "production") {
    const routes = (app as any).routes || []
    const routePaths = routes.map((r: any) => r.method + " " + r.path).join(", ")
    console.log("  Routes: " + (routePaths || "(none registered)"))
  }

  // Initialize email
  try {
    const emailCfg = (config as any).email
    const emailProvider = createEmailProvider(emailCfg)
    console.log("  Email provider: " + emailProvider.name)
  } catch (err: any) {
    console.log("  Email: " + err.message)
  }

  // Load jobs from jobs/ directory
  const jobDefs = await loadJobs(rootDir)

  // Initialize jobs system (works with any provider)
  const db = platform.database
  const provider = config.database?.provider || "sqlite"
  const jobsCol = db.collection("_Zorux_jobs")

  // Create jobs table DDL (only needed for SQL providers)
  if (db?.run) {
    createJobsTable(db.run.bind(db), provider)
  }

  // Submit job endpoint
  app.post("/api/jobs/:name/submit", async (c: any) => {
    try {
      const name = c.req.param("name")
      const jobs = getRegisteredJobs()
      if (!jobs.has(name)) {
        return c.json({ error: "Unknown job: " + name }, 404)
      }
      const body = await c.req.json().catch(() => ({})) as Record<string, any>
      const id = await submitJob(jobsCol, name, body.args, {
        delay: body.delay,
        maxRetries: body.maxRetries,
      })
      return c.json({ jobId: id, status: "submitted" }, 201)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  const wsHandler = platform.realtime.websocket?.()

  const appInstance: AppInstance = {
    fetch: (req) => app.fetch(req),
    _app: app,
    start: (port = parseInt(process.env.PORT || "3000")) => {
      // Set cache buster for assets
      const assetCB = Date.now().toString(36)
      ;(globalThis as any).__Zorux_ASSET_CB = assetCB
      console.log("")
      console.log("  Zorux v" + getVersion() + " - " + config.name)
      console.log("  API:  http://localhost:" + port + "/api")
      if (config.type === "web" || config.type === "fullstack") {
        console.log("  Web:  http://localhost:" + port + "/admin")
      }
      if (wsHandler) console.log("  WS:   ws://localhost:" + port + "/ws")
      console.log("  Jobs: enabled (" + provider + ")")
      console.log("")

      // Write bundled assets (non-blocking)
      import("./assets").then(m => m.writeBundledAssets(rootDir)).catch(() => {})

      // Start job worker
      startWorker(jobsCol)

      const server = Bun.serve({
        fetch: (req, server) => {
          if (wsHandler && server.upgrade(req)) return
          return app.fetch(req)
        },
        port,
        websocket: wsHandler ? {
          open: (ws: any) => wsHandler.open(ws),
          message: (ws: any, msg: string) => wsHandler.message(ws, msg),
          close: (ws: any) => wsHandler.close(ws),
        } : undefined,
      })

      // Graceful shutdown
      const shutdown = async () => {
        await applyPluginShutdown(plugins)
        server.stop()
      }
      process.on("SIGINT", shutdown)
      process.on("SIGTERM", shutdown)

      // Store server reference for hot reload
      ;(appInstance as any)._server = server
    },
  }

  return appInstance
}
