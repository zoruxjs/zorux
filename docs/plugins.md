# Plugins

Zorux has a powerful plugin system that supports npm packages and local plugins with 12 auto-detection adapters for seamless integration.

## Configuration

```yaml
plugins:
  - my-local-plugin             # Loads from plugins/my-local-plugin.ts
  - zorux-analytics             # Loads from npm package

pluginConfig:
  zorux-analytics:
    trackingId: UA-XXXXX
    enabled: true
```

## Plugin Loading

### Local Plugins

```
plugins/my-plugin.ts            # Single file
plugins/my-plugin/index.ts      # Directory with index
```

### npm Packages

```bash
npm install zorux-analytics
```

```yaml
plugins:
  - zorux-analytics
```

The loader tries the exact name first, then prepends `zorux-plugin-` (with legacy fallback to `kai-plugin-`):
1. `zorux-analytics` (exact match)
2. `zorux-plugin-zorux-analytics` (preferred prefix)
3. `kai-plugin-zorux-analytics` (legacy fallback)

## Plugin Interface

```typescript
interface KaiPlugin {
  name: string
  version?: string
  description?: string
  dependsOn?: string[]

  // Lifecycle hooks
  onConfig?: (config: AppConfig) => AppConfig | Promise<AppConfig>
  onModel?: (models: Record<string, any>) => Record<string, any> | Promise<...>
  onCompiledModel?: (models: CompiledModel[], config: AppConfig) => CompiledModel[] | Promise<...>
  onSchema?: (schema: string, model: CompiledModel) => string | Promise<string>
  onRoutes?: (app: Hono, platform: PlatformAdapter) => void | Promise<void>
  onMiddleware?: (app: Hono) => void | Promise<void>
  onDBQuery?: (query: { sql, params?, operation }) => { sql, params? } | Promise<...>
  onError?: (error: Error, context: { request?, model? }) => Response | void
  onStart?: (platform: PlatformAdapter) => void | Promise<void>
  onShutdown?: () => void | Promise<void>
}
```

## Lifecycle Hooks

### `onConfig`

Modify the app configuration before compilation.

```typescript
export default {
  name: "my-plugin",
  onConfig(config) {
    return {
      ...config,
      cache: { provider: "redis", url: process.env.REDIS_URL }
    }
  }
}
```

### `onModel`

Modify raw model definitions before compilation.

```typescript
export default {
  name: "my-plugin",
  onModel(models) {
    // Add timestamps to all models
    for (const model of Object.values(models)) {
      model.timestamps = true
    }
    return models
  }
}
```

### `onCompiledModel`

Modify compiled models after compilation.

```typescript
export default {
  name: "my-plugin",
  onCompiledModel(models, config) {
    // Add a virtual field to all models
    for (const model of models) {
      model.fields._pluginData = { type: "text" }
    }
    return models
  }
}
```

### `onSchema`

Modify SQL schema generation.

```typescript
export default {
  name: "my-plugin",
  onSchema(schema, model) {
    // Add an index
    return schema + `\nCREATE INDEX idx_${model.tableName}_custom ON ${model.tableName}(custom_field);`
  }
}
```

### `onRoutes`

Add custom routes. Registered AFTER admin routes, so plugins can override them.

```typescript
export default {
  name: "my-plugin",
  onRoutes(app, platform) {
    app.get("/custom", (c) => c.json({ hello: "world" }))

    // Override admin dashboard
    app.get("/admin", (c) => c.html("<h1>Custom Dashboard</h1>"))
  }
}
```

### `onMiddleware`

Add global middleware.

```typescript
export default {
  name: "my-plugin",
  onMiddleware(app) {
    app.use("*", async (c, next) => {
      const start = Date.now()
      await next()
      const ms = Date.now() - start
      c.header("X-Response-Time", `${ms}ms`)
    })
  }
}
```

### `onDBQuery`

Intercept database queries.

```typescript
export default {
  name: "my-plugin",
  onDBQuery(query) {
    console.log(`SQL: ${query.sql}`, query.params)
    return query
  }
}
```

### `onError`

Custom error handling.

```typescript
export default {
  name: "my-plugin",
  onError(error, context) {
    console.error("Plugin error:", error.message)
    // Return custom response
    return new Response("Custom error page", { status: 500 })
  }
}
```

### `onStart`

Run code on server startup.

```typescript
export default {
  name: "my-plugin",
  onStart(platform) {
    console.log("Plugin started!")
    // Initialize connections, start workers, etc.
  }
}
```

### `onShutdown`

Clean up on server shutdown.

```typescript
export default {
  name: "my-plugin",
  onShutdown() {
    // Close connections, save state, etc.
  }
}
```

## Dependency Resolution

Plugins can declare dependencies:

```typescript
export default {
  name: "my-plugin",
  dependsOn: ["base-plugin", "auth-plugin"],
  // ...
}
```

Dependencies are resolved via topological sort and loaded in order.

## Adapter System (12 Adapters)

Zorux auto-detects and adapts 12 different package patterns:

| # | Pattern | Example |
|---|---|---|
| 1 | Native KaiPlugin | `export default { name, onRoutes }` |
| 2 | Hono middleware | `export default (c, next) => next()` |
| 3 | Express middleware | `export default (req, res, next) => next()` |
| 4 | Express Router | `export default express.Router()` |
| 5 | Express app | `export default express()` |
| 6 | Passport Strategy | `export default new PassportStrategy()` |
| 7 | `install()` hook | `export const install = (app) => {}` |
| 8 | `setup()`/`init()`/`register()` | `export const setup = (app) => {}` |
| 9 | Koa middleware | `export default (ctx, next) => next()` |
| 10 | Fastify plugin | `export default async (app, opts) => {}` |
| 11 | Namespace with middleware | `export const middleware = [...]` |
| 12 | Class with `handle()` | `export default class { handle() {} }` |

## Plugin Config

Access plugin configuration:

```typescript
export default {
  name: "my-plugin",
  onStart(platform) {
    const config = platform.config.pluginConfig?.["my-plugin"]
    console.log("My setting:", config?.setting1)
  }
}
```

## CLI Commands

```bash
# List installed plugins
zorux plugin list

# Add a plugin
zorux plugin add zorux-analytics

# Remove a plugin
zorux plugin remove zorux-analytics
```

## Example: Analytics Plugin

```typescript
// plugins/analytics.ts
import { Hono } from "hono"

export default {
  name: "zorux-analytics",
  version: "1.0.0",
  description: "Page view analytics",

  onRoutes(app: Hono) {
    // Track page views
    app.use("*", async (c, next) => {
      await next()
      const path = c.req.path
      const ua = c.req.header("user-agent") || ""

      // Skip API routes and static files
      if (path.startsWith("/api") || path.startsWith("/static")) return

      // Record page view
      const db = c.get("db")
      db.collection("_page_views").insert({
        path,
        ua,
        timestamp: new Date().toISOString()
      })
    })

    // Analytics endpoint
    app.get("/api/analytics/views", async (c) => {
      const db = c.get("db")
      const views = db.collection("_page_views").find()
      return c.json({ views })
    })
  },

  onStart(platform) {
    console.log("Analytics plugin started")
  }
}
```

## Best Practices

1. **Use unique names** — Avoid conflicts with other plugins
2. **Lazy load dependencies** — Use `require()` inside functions, not at module scope
3. **Handle errors gracefully** — Don't crash the server
4. **Document your plugin** — Include usage examples
5. **Test thoroughly** — Test with different database providers
6. **Respect the lifecycle** — Use the right hook for the right purpose
