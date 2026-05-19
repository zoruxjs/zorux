# Zorux

**AI-native multi-platform framework. One YAML file generates API, Admin, Mobile, Desktop, PWA, Auth, Payments, Real-time, and Tests.**

[![npm version](https://img.shields.io/npm/v/zorux.svg)](https://www.npmjs.com/package/zorux)
[![npm downloads](https://img.shields.io/npm/dm/zorux.svg)](https://www.npmjs.com/package/zorux)
[![Tests](https://img.shields.io/badge/tests-371%20passing-brightgreen)](#)
[![License](https://img.shields.io/badge/license-MIT-red.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/bun-1.2%2B-black)](https://bun.sh)

```bash
npm install -g zorux
zorux new my-app --saas
cd my-app && zorux dev
```

**API → http://localhost:3000/api · Admin → http://localhost:3000/admin · Swagger → http://localhost:3000/api/docs**

---

## Why Zorux?

**Built for humans and AI agents.** Traditional frameworks require wiring dozens of packages, writing boilerplate for every feature, and burning thousands of AI tokens on repetitive code. Zorux eliminates all of that.

| | Zorux | Traditional |
|---|---|---|
| Config files | 1 (`app.yaml`) | 10–30 |
| Packages to install | 0 (all built-in) | 20–50 |
| AI tokens to scaffold an app | ~500 | ~5,000 |
| Time to first CRUD | 10 seconds | 30–60 min |
| Auth providers | 35 built-in | Manual setup each |
| Platforms from one schema | 6 (API, Admin, Mobile, Desktop, PWA, GraphQL) | 1 |

---

## Quick Start

```bash
# Install
npm install -g zorux

# Create a full SaaS app
zorux new my-app --saas

# Start developing
cd my-app && zorux dev
```

### Project types

| Flag | Generates |
|---|---|
| `--api` | REST API + Swagger |
| `--web` | API + Admin Panel |
| `--mobile` | API + Expo (React Native) |
| `--fullstack` | API + Admin + Web UI |
| `--saas` | API + Admin + Auth + Payments + Tests |
| `--all` | API + Admin + Mobile + Desktop + PWA |

### UI frameworks

```
zorux new my-app --saas --ui tailwind
zorux new my-app --fullstack --ui daisyui
zorux new my-app --saas --ui antd
```

**6 themes:** Tailwind, DaisyUI, Ant Design, MUI, Chakra, Mantine, Headless

---

## The One File — `app.yaml`

```yaml
name: my-app
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
- **35 OAuth providers** — Google, GitHub, Apple, Discord, Twitter, LinkedIn, Slack, Spotify, Twitch, and 25+ more
- **WebAuthn / Passkeys** — Passwordless login with biometrics (Fingerprint, Face ID)
- **2FA TOTP** — Google Authenticator, Authy, recovery codes
- **Magic Link + Email OTP** — Passwordless email login
- **API Keys** — Scoped, rate-limited, revocable
- **OAuth 2.0 + OIDC Provider** — Make your app an identity provider with JWKS
- **Social Account Linking** — Multiple providers, one account
- **Organizations / Teams** — Multi-org with invites and roles
- **ABAC + RBAC** — Expression engine: `==`, `!=`, `>`, `in`, `matches`, `exists`, `&&`, `||`
- **Session Management** — Multi-session with refresh tokens

### Platform
- **REST API** — Full CRUD with pagination, sort, search, field filtering, bulk operations, import/export
- **Admin Panel** — Dashboard with stats, charts, rich text, file upload, email viewer
- **Mobile (Expo)** — Full React Native app with typed SDK per model
- **Desktop (Tauri v2)** — Native Windows/macOS/Linux app with Rust backend
- **PWA** — Manifest + service worker, installable on any device
- **GraphQL** — Auto-generated schema from models
- **OpenAPI / Swagger** — Auto-generated docs at `/api/docs`

### Data & Storage
- **7 Database Providers** — SQLite, PostgreSQL, MySQL, MongoDB, Cloudflare D1, Supabase, `:memory:`
- **8 Cache Providers** — Memory, Redis, Upstash, Memcached, DynamoDB, SQLite, Cloudflare KV, Durable Objects
- **3 Storage Providers** — Local filesystem, S3 (AWS/MinIO/R2/Spaces), Supabase
- **5 Email Providers** — Sandbox, Log, Resend, SendGrid, SMTP/Nodemailer

### Payments
- **Stripe** — Checkout sessions, subscriptions, webhooks, customer portal
- **Polar** — Alternative payment provider

### Developer Experience
- **25+ CLI Commands** — `new`, `dev`, `gen`, `add`, `make`, `seed`, `deploy`, `db`, `test`, `audit`, `scaffold`, `console`, `runner`, `credentials`, `plugin`, `completion`
- **Hot Reload** — File watcher on `app.yaml`, `actions/`, `plugins/`, `locales/`
- **Auto-Generated Tests** — Integration, validation, edge cases, security, e2e, fuzz, concurrent
- **Scaffolds** — Forum, blog, ecommerce, SaaS — pre-built apps with full test suites
- **Deploy Anywhere** — Docker, Vercel, Netlify, Cloudflare Workers — one command

### Real-time & Events
- **WebSocket** — Pub/sub engine with channel-based messaging
- **Webhooks** — Auto-fire on CRUD with HMAC-SHA256 signing
- **Background Jobs** — Persistent queues with exponential backoff
- **Event System** — `emit()`, `on()`, `onAny()` with wildcards and priority
- **Notifications** — In-app notification system with read tracking

### Security
- **ABAC + RBAC** — Attribute-based access control with recursive descent parser
- **Audit Log** — Every mutation logged with user, IP, old/new values
- **Security Headers** — CSP, rate limiting, CSRF, body size limit
- **Soft Delete** — `deleted_at` with restore and permanent delete
- **Multi-tenancy** — Auto-scoped models by organization

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

## CLI Reference

```
Usage: zorux <command> [options]

Commands:
  new <name> [--api|--web|--mobile|--fullstack|--saas|--all] [--ui <theme>]
  dev [port]
  gen mobile|desktop|pwa|graphql
  add model <name> <fields...>
  make action|job|migration <name>
  seed [--count <n>]
  deploy docker|vercel|netlify|cloudflare
  db migrate|reset|rollback|status
  test [--run|--e2e|--security|--fuzz|--bench]
  scaffold forum|blog|ecommerce|saas
  console
  runner <file>
  credentials setup|edit|show
  plugin list|add|remove
  audit
  docs
  info
  version
  completion bash|zsh|fish
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

---

## Stats

- **13,647** lines of TypeScript
- **93** source files
- **371** tests, **0** failures, **636** expectations
- **47** built-in features
- **0** external runtime dependencies (all optional, lazy-loaded)

---

## Tech Stack

- **Runtime:** Bun 1.2+
- **HTTP:** Hono
- **Database:** bun:sqlite (native), optional PostgreSQL/MySQL/MongoDB adapters
- **Auth:** Built-in JWT, OAuth 2.0, WebAuthn, TOTP
- **Real-time:** Native Bun WebSocket
- **Templates:** JSX (Hono JSX)
- **Validation:** Zod
- **CLI:** Commander

---

## License

MIT © Zorux
