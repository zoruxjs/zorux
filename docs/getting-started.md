# Getting Started

<!-- maturity: ✅ Stable -->
> **✅ Stable** — This feature is ready for production


Zorux is an AI-first full-stack framework. A single `app.yaml` file generates your entire application — REST API, admin panel, mobile app, desktop app, PWA, GraphQL, webhooks, background jobs, authentication with 35+ OAuth providers, and more.

## Why Zorux

Traditional frameworks require you to wire together dozens of packages, write boilerplate for every feature, and spend thousands of AI tokens on repetitive code. Zorux eliminates all of that.

| Feature | Zorux | Traditional |
|---|---|---|
| Tokens to generate full-stack app | ~500 | ~5,000 |
| Config files | 1 (`app.yaml`) | 10-30 |
| Packages to install | 0 (all built-in) | 20-50 |
| Time to first CRUD | 10 seconds | 30-60 min |
| Auth providers | 35 built-in | Manual setup each |

## Installation

```bash
npm install -g zorux
```

**Requirements:** Node.js 20+ or Bun 1.2+

## Quick Start

### 1. Create a project

```bash
# Full SaaS (API + Admin + Auth + Payments + Teams)
zorux new my-app --preset saas

# API-only
zorux new my-api --preset api

# Blog with public posts
zorux new my-blog --preset blog

# Web app (API + Admin + Landing)
zorux new my-web --preset web

# Minimal (no example pages)
zorux new my-app --preset web --minimal

# API only
zorux new my-api --api

# Full-stack (API + Admin)
zorux new my-app --fullstack

# With specific UI framework
zorux new my-app --saas --ui tailwind
```

### 2. Define your models

Edit `app.yaml`:

```yaml
name: my-app
database:
  provider: sqlite

models:
  Post:
    fields:
      title: string required
      body: text required
      status: string enum:draft,published,archived default:draft
      author: User
    timestamps: true
    policies:
      list: public
      create: authenticated
      update: owner
      delete: admin

  User:
    fields:
      name: string required
      email: email required unique
      avatar: file
    auth: password
    timestamps: true
```

### 3. Run

```bash
cd my-app
zorux dev
```

Your app is now running at `http://localhost:3000`:
- **API**: `http://localhost:3000/api`
- **Admin**: `http://localhost:3000/admin`
- **Swagger UI**: `http://localhost:3000/api/docs`
- **WebSocket**: `ws://localhost:3000/ws`
- **Forms**: `http://localhost:3000/forms/<name>` (if configured)

Declarative forms can be added via `forms:` in `app.yaml` — see the [Forms Reference](forms.md) for details.

## Project Structure

```
my-app/
├── app.yaml              # Single source of truth
├── actions/              # Custom action handlers
│   └── my-action.ts
├── jobs/                 # Background job definitions
│   └── send-email.ts
├── plugins/              # Local plugins
│   └── my-plugin.ts
├── migrations/           # Database migrations
│   └── 20260101000000_create_table.sql
├── locales/              # i18n translation files
│   └── en.json
├── public/               # Static files
│   └── uploads/          # Uploaded files (local storage)
├── db/
│   └── app.db            # SQLite database (auto-created)
└── package.json
```

## CLI Commands

```bash
zorux new <name> [options]        # Create new project (--preset, --minimal)
zorux dev [port]                  # Start dev server with hot reload
zorux gen mobile                  # Generate Expo mobile app
zorux gen desktop                 # Generate Tauri desktop app
zorux gen pwa                     # Generate PWA
zorux gen graphql                 # Generate GraphQL client
zorux add model <Name> ...        # Add model to app.yaml
zorux add field <m> <f>:<t>       # Add field to existing model
zorux add page <name>             # Generate DaisyUI page
zorux add package <pkg>           # Install + register provider
zorux add plugin <name>           # Scaffold plugin file
zorux make action <name>          # Create action file
zorux make job <name>             # Create job file
zorux make migration <name>       # Create migration file
zorux seed [--count N]            # Seed database
zorux db reset                    # Delete database
zorux db migrate [--auto]         # Run migrations
zorux db rollback                 # Rollback last batch
zorux db status                   # Show migration status
zorux db schema dump              # Dump schema to SQL
zorux deploy                      # Deploy app
zorux test                        # Run tests
zorux audit                       # Security audit
zorux info                        # Project info
zorux docs [topic]                # Open documentation
zorux scaffold <template>         # Scaffold from template
zorux console                     # Interactive REPL
zorux plugin list|add|remove      # Manage plugins
zorux credentials setup           # Manage credentials
zorux recipe add <name>           # Apply YAML recipe
zorux inspect [--json]            # Project manifest
zorux explain [app.yaml]          # Generation plan
zorux verify                      # Validate project contract
zorux doctor [--verbose]          # Full diagnostic
zorux context [--budget N]        # LLM context
zorux routes                      # Route map with ownership
zorux map                         # File ownership map
zorux diff                        # Semantic diff
zorux decisions                   # Decision tree
zorux ownership <name>            # Model/route/field ownership
zorux token-report                # Token savings estimate
zorux snapshot                    # Project state snapshot
zorux cleanup                     # Remove old name references
zorux agent init                  # Generate agent instructions
zorux lint agent                  # Detect agent anti-patterns
zorux guard install               # Install preinstall guard
zorux version                 # Show version
```

## Auto-Generated API

Every model automatically gets full CRUD endpoints:

```bash
# List posts (with pagination, search, sort)
GET /api/posts?page=1&limit=20&search=hello&sort=created_at&order=desc

# Create a post
POST /api/posts
{"title": "Hello", "body": "World", "authorId": 1}

# Get a post
GET /api/posts/1

# Update a post
PUT /api/posts/1
{"title": "Updated"}

# Delete a post
DELETE /api/posts/1

# Bulk operations
POST /api/posts/bulk
PUT /api/posts/bulk
DELETE /api/posts/bulk

# Export/Import
GET /api/posts/export?format=csv
POST /api/posts/import  # multipart file upload
```

## Next Steps

- [YAML Reference](yaml) — Complete schema documentation
- [API Reference](api) — All endpoints and query params
- [Authentication](auth) — All auth methods
- [Admin Panel](admin) — Admin UI features
- [CLI Reference](cli) — All commands
- [Database](database) — Providers and migrations
- [Security](security) — ABAC, RBAC, headers
- [Deploy](deploy) — Production deployment
