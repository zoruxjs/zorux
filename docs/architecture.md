# Architecture

<!-- maturity: ✅ Stable -->
> **✅ Stable** — This feature is ready for production


Zorux is built on a compilation pipeline that transforms a single YAML file into a complete full-stack application.

## Overview

```
app.yaml → Parse → Compile → Platform → Router → Middleware → Server
```

## Compilation Pipeline

### 1. Parse YAML

```typescript
const config = parseAppConfig(yamlString)
```

Parses `app.yaml` into an `AppConfig` object with models, auth, database, plugins, etc.

### 2. Load Plugins

```typescript
const plugins = await loadPlugins(config.plugins)
```

Loads plugins from npm packages and local files. Resolves dependencies via topological sort.

### 3. Apply Plugin Config

```typescript
const modifiedConfig = await applyPluginConfig(config, plugins)
```

Plugins can modify the app configuration via `onConfig` hook.

### 4. Apply Plugin Models

```typescript
const modifiedModels = await applyPluginModels(config.models, plugins)
```

Plugins can add or modify model definitions via `onModel` hook.

### 5. Compile Models

```typescript
const compiledModels = compileModels(modifiedModels)
```

Transforms raw model definitions into compiled models with:
- Pluralized table names (`Post` → `posts`)
- Field type mapping (`string` → `TEXT`)
- Relation resolution (foreign keys, join tables)
- Policy parsing (ABAC expressions → AST)
- Auto-generated columns (timestamps, soft delete, auth)

### 6. Apply Plugin Compiled Models

```typescript
const finalModels = await applyPluginCompiledModels(compiledModels, config, plugins)
```

Plugins can modify compiled models via `onCompiledModel` hook.

### 7. Create Platform

```typescript
const platform = createPlatform(config, finalModels)
```

Creates the `PlatformAdapter` with:
- Database adapter (SQLite, PostgreSQL, MySQL, MongoDB, D1)
- Auth module (JWT, sessions, OAuth, WebAuthn, 2FA)
- Real-time engine (WebSocket, pub/sub)
- Storage provider (local, S3, Supabase)
- Cache adapter (memory, Redis, Upstash, etc.)
- Email provider (fake, log, Resend, SendGrid, SMTP)
- Payment provider (Stripe, Polar)
- Search engine (Meilisearch)

### 8. Create Router

```typescript
const app = createRouter(platform, finalModels)
```

Generates Hono app with CRUD routes for each model:
- `GET /api/{model}` — List
- `POST /api/{model}` — Create
- `GET /api/{model}/:id` — Get
- `PUT /api/{model}/:id` — Update
- `DELETE /api/{model}/:id` — Delete
- Bulk, import/export, soft delete routes

Each route includes:
- Authentication middleware
- RBAC/ABAC policy enforcement
- Input validation
- Audit logging
- Webhook firing
- Event emission
- Cache invalidation

### 9. Register Subsystems

Additional routes and middleware are registered:

| Subsystem | Routes |
|---|---|
| Social Auth | `/api/auth/social/{provider}/authorize`, `/callback` |
| Advanced Auth | `/api/auth/forgot-password`, `/reset-password`, etc. |
| Organizations | `/api/auth/orgs/*` |
| WebAuthn | `/api/auth/webauthn/*` |
| OAuth Provider | `/api/oauth/*` |
| Captcha | `/api/captcha/verify` |
| Payments | `/api/payments/*` |
| Webhooks | `/api/webhooks/*` |
| Notifications | `/api/notifications/*` |
| Search | `/api/search/*` |
| Feature Flags | `/api/features/*` |
| Audit Logs | `/api/audit-logs` |
| Monitor | `/api/health`, `/api/admin/metrics` |

### 10. Apply Plugin Middleware

```typescript
await applyPluginMiddleware(app, plugins)
```

Plugins add global middleware via `onMiddleware` hook.

### 11. Apply Security Middleware

```typescript
applySecurityMiddleware(app)
```

Adds:
- Security headers (CSP, X-Frame-Options, etc.)
- Rate limiter (200 req/min)
- Body size limit (1MB)
- CSRF protection

### 12. Apply Cache Middleware

```typescript
applyCacheMiddleware(app, cache)
```

Caches GET responses with `X-Cache: HIT/MISS` headers.

### 13. Apply Telemetry Middleware

```typescript
applyTelemetryMiddleware(app, exporter)
```

Traces every HTTP request with duration, method, path, status.

### 14. Apply i18n Middleware

```typescript
applyI18nMiddleware(app, config.i18n)
```

Detects locale from query param, cookie, or Accept-Language header.

### 15. Register GraphQL

```typescript
registerGraphQL(app, compiledModels, platform)
```

Auto-generates GraphQL schema from models.

### 16. Register Web Admin

```typescript
registerWebAdmin(app, compiledModels, platform)
```

Adds admin UI routes (if `--web`, `--fullstack`, or `--saas`).

### 17. Apply Plugin Routes

```typescript
await applyPluginRoutes(app, platform, plugins)
```

Plugins add custom routes. Registered LAST so they can override admin routes.

### 18. Plugin Startup

```typescript
await applyPluginStart(platform, plugins)
```

Runs `onStart` hook for all plugins.

### 19. Start Job Worker

```typescript
startJobWorker(platform.db, jobs)
```

Background job worker polls every 1000ms for pending jobs.

### 20. Start Server

```typescript
Bun.serve({
  fetch: app.fetch,
  websocket: { message, open, close }
})
```

Starts HTTP + WebSocket server.

## Dev Server Hot Reload

```typescript
fs.watch(rootDir, { recursive: true }, (event, filename) => {
  // Filter: .yaml, .ts, .js, .tsx, .jsx, .json, .css
  // Ignore: node_modules, dist
  // Debounce: 300ms
  // Clear module cache
  // Recreate app
})
```

Watches:
- `app.yaml` — Full rebuild
- `actions/*.ts` — Reload actions
- `jobs/*.ts` — Reload jobs
- `plugins/*.ts` — Reload plugins
- `locales/*.json` — Reload translations
- `views/` — Reload admin templates

## Module Architecture

```
src/
├── core/
│   ├── app.ts              # Orchestrator (pipeline)
│   ├── compiler.ts          # Model compiler
│   ├── router.ts            # CRUD route generator
│   ├── schema.ts            # Database schema generator
│   ├── validation.ts        # Zod validation schemas
│   ├── types.ts             # TypeScript type definitions
│   ├── db.ts                # Database adapters
│   ├── auth/                # Authentication system
│   ├── security/            # Security middleware
│   ├── plugin/              # Plugin system
│   ├── cache/               # Cache adapters
│   ├── storage/             # Storage providers
│   ├── email/               # Email providers
│   ├── jobs/                # Background jobs
│   ├── payments/            # Payment providers
│   ├── realtime/            # WebSocket + pub/sub
│   ├── webhooks/            # Webhook system
│   ├── events/              # Event emitter
│   ├── i18n/                # Internationalization
│   ├── telemetry/           # Metrics + tracing
│   ├── theme/               # UI theme adapters
│   ├── search/              # Meilisearch integration
│   ├── graphql/             # GraphQL schema generator
│   └── policy-engine/       # ABAC policy parser
├── views/                   # Admin UI (Hono JSX)
│   ├── pages/               # Page components
│   ├── components/          # Shared components
│   └── static/              # CSS, JS, icons
└── cli/                     # CLI commands
```

## Key Design Decisions

### Single Source of Truth

`app.yaml` is the exclusive DSL. No separate route files, config files, or migration scripts. Everything is inferred from models.

### Convention Over Configuration

- Model names are pluralized for table names
- Relations create foreign keys automatically
- Auth model gets password field and auth routes
- Timestamps add `created_at`/`updated_at`
- Soft delete adds `deleted_at` and restore endpoint

### Lazy Optional Dependencies

All optional packages are `require()`d inside function bodies, not at module scope:

```typescript
// Good — lazy loaded
function createStripeClient() {
  const Stripe = require("stripe")
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

// Bad — loaded at module scope
const Stripe = require("stripe")  // Fails if not installed
```

### Provider-Agnostic Interfaces

All subsystems use interfaces:
- `DatabaseAdapter` — SQLite, PostgreSQL, MySQL, MongoDB, D1
- `CacheAdapter` — Memory, Redis, Upstash, Memcached, etc.
- `StorageProvider` — Local, S3, Supabase
- `EmailProvider` — Fake, Log, Resend, SendGrid, SMTP
- `PaymentProvider` — Stripe, Polar

Switch providers by changing one line in YAML.

### UUID v7

Default ID type is UUID v7 (RFC 9562):
- Time-ordered (sortable by time)
- Cryptographically random suffix
- Zero dependencies

### Plugin Routes After Admin

Plugin routes are registered AFTER web admin routes, allowing plugins to override admin pages (e.g., custom landing page at `/`).

### bun:sqlite

SQLite uses `bun:sqlite` directly (not better-sqlite3). All DB operations go through `schema.sqlite.prepare()`.

### WebSocket via Bun Native

Uses `Bun.serve()` with `websocket` option. No external WebSocket packages.

## Performance Optimizations

| Optimization | Description |
|---|---|
| Prepared statement cache | SQLite statements cached after first use |
| AST cache | Policy expressions under 500 chars cached |
| Password verify cache | Login verification cached (~0.36ms) |
| Lazy require() | Optional deps loaded only when used |
| fs.watch | Hot reload via native file watcher |
| In-memory rate limiter | Token bucket with no I/O |
| Cache middleware | GET responses cached with TTL |
