# Plugins

## Installing Plugins

```yaml
plugins:
  - health-check       # Local: plugins/health-check.ts
  - Zorux-plugin-stripe  # npm: Zorux-plugin-stripe
  - stripe             # npm: tenta Zorux-plugin-stripe + stripe
```

## Writing a Plugin

```ts
// plugins/health-check.ts
export default {
  name: "health-check",
  version: "1.0.0",
  onRoutes(app, platform) {
    app.get("/health", (c) => {
      return c.json({ status: "ok", app: platform.config.name })
    })
  },
}
```

## Plugin API

```ts
interface KaiPlugin {
  name: string
  version?: string
  onConfig?: (config) => Config           // Modify config before startup
  onRoutes?: (app, platform) => void      // Add routes
  onStart?: (platform) => void            // Startup hook
}
```
