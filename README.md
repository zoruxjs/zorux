# Zorux

**AI-native full-stack framework. One YAML file generates API, Admin, Mobile, Desktop, PWA, Auth, Payments, Real-time, Tests, and Forms.**

[![npm version](https://img.shields.io/npm/v/zorux.svg)](https://www.npmjs.com/package/zorux)
[![npm downloads](https://img.shields.io/npm/dm/zorux.svg)](https://www.npmjs.com/package/zorux)
[![Tests](https://img.shields.io/badge/tests-397%20passing-brightgreen)](#)
[![License](https://img.shields.io/badge/license-MIT-red.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/bun-1.2%2B-black)](https://bun.sh)

```bash
npm install -g zorux
zorux new my-app --preset saas
cd my-app && bun install && zorux dev
```

**API → `http://localhost:3000/api` · Admin → `http://localhost:3000/admin` · Swagger → `http://localhost:3000/api/docs` · Forms → `http://localhost:3000/forms/<name>`**

---

## Why Zorux?

**Built for humans and AI agents.** Traditional frameworks require wiring dozens of packages, writing boilerplate for every feature, and burning thousands of AI tokens on repetitive code. Zorux eliminates all of that.

| | Zorux | Traditional |
|---|---|---|
| Config files | **1** (`app.yaml`) | 10–30 |
| Packages to install | **0** (all built-in) | 20–50 |
| AI tokens to scaffold an app | **~500** | ~5,000 |
| Time to first CRUD | **10 seconds** | 30–60 min |
| Auth providers | **35 built-in** | Manual setup each |
| Platforms from one schema | **7** (API, Admin, Mobile, Desktop, PWA, GraphQL, Forms) | 1 |
| CLI commands | **55+** | 10–20 |

---

## Quick Start

```bash
# Install
npm install -g zorux

# Create a full SaaS app
zorux new my-app --preset saas

# Start developing
cd my-app && bun install && zorux dev
```

### Presets

| Preset | Generates |
|---|---|
| `--preset api` | REST API + Swagger |
| `--preset web` | API + Admin + Landing page |
| `--preset saas` | API + Admin + Auth + Payments + Teams |
| `--preset blog` | Blog with public posts, categories |
| `--minimal` | Minimal project (no example pages) |

### UI Framework

```bash
zorux new my-app --preset saas --ui daisyui
```

**7 themes:** Tailwind, DaisyUI, Ant Design, MUI, Chakra, Mantine, Headless

---

## The One File — `app.yaml`

```yaml
name: my-app
type: fullstack
database:
  provider: sqlite

models:
  Post:
    fields:
      title: string required max:200
      body: text required
      status: string enum:draft,published default:draft
      author: User
    timestamps: true
    hooks:
      beforeCreate: actions/validate-post.ts
      afterCreate: actions/notify-subscribers.ts
    policies:
      list: "*"
      create: authenticated
      update: owner
      delete: admin

auth:
  model: User
  registration: open
  roles: [admin, editor, user]
  social:
    google:
      clientId: ${GOOGLE_CLIENT_ID}
      clientSecret: ${GOOGLE_CLIENT_SECRET}

forms:
  subscribe:
    title: Newsletter
    model: Subscriber
    fields: [email, name]
    button: Subscribe
    honeypot: true

cache:
  provider: memory

realtime:
  enabled: true

email:
  provider: sandbox
```

AI agents can read, understand, and modify your entire app by editing this single file. No sprawling codebases. No context window limits.

---

## Features

### Authentication & Authorization
- **35 OAuth providers** — Google, GitHub, Apple, Discord, and 31+ more
- **WebAuthn / Passkeys** — Passwordless login with biometrics
- **2FA TOTP** — Google Authenticator, Authy, recovery codes
- **Magic Link + Email OTP** — Passwordless email login
- **API Keys** — Scoped, rate-limited, revocable
- **OAuth 2.0 + OIDC Provider** — Make your app an identity provider
- **Organizations / Teams** — Multi-org with invites and roles
- **ABAC + RBAC** — Expression engine with recursive descent parser
- **CRUD Hooks** — beforeCreate, afterCreate, beforeUpdate, afterUpdate, beforeDelete, afterDelete

### Platform
- **REST API** — Full CRUD with pagination, sort, search, bulk, import/export
- **Admin Panel** — DaisyUI 5 + Tailwind CSS 4, sidebar, modal, charts, file upload
- **Mobile (Expo)** — Full React Native app with typed SDK per model
- **Desktop (Tauri v2)** — Native app with Rust backend
- **PWA** — Manifest + service worker, installable
- **GraphQL** — Auto-generated schema from models
- **OpenAPI / Swagger** — Auto-generated docs at `/api/docs`
- **Declarative Forms** — YAML-defined forms with DaisyUI, validation, honeypot

### Data & Storage
- **7 Database Providers** — SQLite, PostgreSQL, MySQL, MongoDB, Cloudflare D1, Supabase, `:memory:`
- **8 Cache Providers** — Memory, Redis, Upstash, Memcached, DynamoDB, SQLite, Cloudflare KV, Durable Objects
- **3 Storage Providers** — Local, S3 (AWS/MinIO/R2/Spaces), Supabase
- **5 Email Providers** — Sandbox, Log, Resend, SendGrid, SMTP

### Payments
- **Stripe** — Checkout sessions, subscriptions, webhooks, customer portal
- **Polar** — Alternative payment provider

### Developer Experience
- **55+ CLI Commands** — The most complete CLI in its class
- **20 Recipes** — `zorux recipe add blog|teams|billing|ecommerce|newsletter|agent-api|...`
- **Live Reload** — EventSource-based browser auto-refresh, CSS-only HMR, polling fallback
- **AI-Native** — AGENTS.md, CLAUDE.md, cursor rules, copilot instructions auto-generated
- **Quality Gates** — `zorux lint ai`, `zorux quality`, `zorux review`, `zorux fix ai`
- **Introspecção** — `zorux inspect`, `zorux explain`, `zorux routes`, `zorux map`, `zorux decisions`, `zorux ownership`, `zorux diff`
- **Diagnóstico** — `zorux doctor`, `zorux verify`, `zorux token-report`, `zorux snapshot`
- **Strict Mode** — Package allowlist, security gates, lint enforcement

### Real-time & Events
- **WebSocket** — Pub/sub engine with channel-based messaging
- **Webhooks** — Auto-fire on CRUD with HMAC-SHA256 signing
- **Background Jobs** — Persistent queues with exponential backoff
- **Event System** — `emit()`, `on()`, `onAny()` with wildcards
- **Notifications** — In-app notification system with read tracking

### Security
- **ABAC + RBAC** — Attribute-based access control
- **Audit Log** — Every mutation logged with context
- **Security Headers** — CSP, rate limiting, CSRF, body size limit
- **Soft Delete** — `deleted_at` with restore
- **Multi-tenancy** — Auto-scoped models by organization
- **Honeypot** — Anti-spam protection on forms

---

## Multi-Platform Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     app.yaml                            │
│  (single source of truth)                               │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    Zorux Compiler                        │
│  YAML → Models → DB Schema → Routes → Policies → Events │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │          │          │
┌──────▼──┐ ┌─────▼─────┐ ┌─▼──────┐ ┌─▼──────────┐
│  REST   │ │  Admin    │ │ Mobile │ │  Desktop    │
│  API    │ │  Panel    │ │ (Expo) │ │  (Tauri)    │
└───┬─────┘ └─────┬─────┘ └───┬────┘ └──────┬──────┘
    │             │           │              │
┌───▼─────────────▼───────────▼──────────────▼──────┐
│              Bun + Hono Runtime                    │
│  WebSocket │ Jobs │ Cache │ Auth │ Payments │ ...  │
└────────────────────────────────────────────────────┘
```

---

## CLI Reference (55+ Commands)

```bash
# Project
zorux new <name> [--preset api|web|saas|blog] [--minimal]
zorux dev [port]
zorux info
zorux version

# Generate
zorux gen mobile|desktop|pwa|graphql
zorux add model|field|page|package|plugin

# Build
zorux make action|job|migration
zorux seed [--count N]

# Database
zorux db migrate [--auto]|reset|rollback|status|schema dump

# Deploy & Test
zorux deploy [docker|vercel|netlify|cloudflare]
zorux test [--run|--e2e|--security]
zorux audit

# Introspect
zorux inspect [--json]
zorux explain [app.yaml]
zorux routes
zorux map
zorux diff
zorux decisions
zorux ownership <model|/route|field>

# Validate
zorux verify
zorux doctor [--verbose]
zorux quality
zorux review

# AI & Agents
zorux context [--budget N] [--output <path>]
zorux token-report
zorux snapshot
zorux agent init
zorux lint ai
zorux lint agent
zorux fix ai
zorux guard install

# Modify
zorux recipe add <name>
zorux apply <change.yaml>
zorux cleanup
zorux scaffold <template>
zorux console
zorux plugin list|add|remove
zorux credentials setup|edit|show
zorux completion bash|zsh|fish
```

### 20 Available Recipes

```
blog, teams, billing, docs-site, newsletter, api-keys, audit-log, waitlist,
ecommerce, notifications, search, dashboard, pricing-page, docker-deploy,
cdn-assets, webhooks-out, scheduled-tasks, agent-api, content-moderation, portfolio
```

---

## Documentation

| Topic | |
|---|---|
| Getting Started | [docs/getting-started.md](docs/getting-started.md) |
| YAML Reference | [docs/yaml.md](docs/yaml.md) |
| API Reference | [docs/api.md](docs/api.md) |
| Authentication | [docs/auth.md](docs/auth.md) |
| Admin Panel | [docs/admin.md](docs/admin.md) |
| CLI Reference | [docs/cli.md](docs/cli.md) |
| Declarative Forms | [docs/forms.md](docs/forms.md) |
| Patterns | [docs/patterns.md](docs/patterns.md) |
| Database | [docs/database.md](docs/database.md) |
| Cache | [docs/cache.md](docs/cache.md) |
| Storage | [docs/storage.md](docs/storage.md) |
| Email | [docs/email.md](docs/email.md) |
| Payments | [docs/payments.md](docs/payments.md) |
| Real-time | [docs/realtime.md](docs/realtime.md) |
| Webhooks | [docs/webhooks.md](docs/webhooks.md) |
| Background Jobs | [docs/jobs.md](docs/jobs.md) |
| GraphQL | [docs/graphql.md](docs/graphql.md) |
| Mobile (Expo) | [docs/mobile.md](docs/mobile.md) |
| Desktop (Tauri) | [docs/desktop.md](docs/desktop.md) |
| PWA | [docs/pwa.md](docs/pwa.md) |
| Security | [docs/security.md](docs/security.md) |
| Plugins | [docs/plugins.md](docs/plugins.md) |
| i18n | [docs/i18n.md](docs/i18n.md) |
| Telemetry | [docs/telemetry.md](docs/telemetry.md) |
| Deploy | [docs/deploy.md](docs/deploy.md) |
| Architecture | [docs/architecture.md](docs/architecture.md) |
| LLM Context | [docs/llm/context.md](docs/llm/context.md) |

---

## Maturity

| Level | Features |
|---|---|
| **✅ Stable** | API, CRUD, SQLite, Admin, Auth, OpenAPI, Cache, DB migrations, CLI, Forms, Live Reload |
| **🧪 Beta** | GraphQL, Webhooks, Jobs, Plugins, Feature Flags, Deploy, Recipes |
| **🔬 Experimental** | Mobile (Expo), Desktop (Tauri), Payments, Multi-DB Providers |

---

## Stats

- **397** tests, **0** failures, **712** expectations
- **55+** CLI commands
- **20** built-in recipes
- **47+** built-in features
- **0** external runtime dependencies (all optional, lazy-loaded)
- **~150KB** compiled admin CSS (DaisyUI 5 + Tailwind CSS 4, tree-shaken)

---

## Tech Stack

- **Runtime:** Bun 1.2+
- **HTTP:** Hono
- **Admin UI:** DaisyUI 5 + Tailwind CSS 4
- **Database:** `bun:sqlite` (native), optional PostgreSQL/MySQL/MongoDB adapters
- **Auth:** Built-in JWT, OAuth 2.0, WebAuthn, TOTP
- **Real-time:** Native Bun WebSocket
- **Templates:** Hono JSX
- **Validation:** Zod
- **CLI:** Commander

---

## License

MIT © Zorux
