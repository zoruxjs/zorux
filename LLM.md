# Zorux — AI-first Full-stack Framework

## Core Concept

A single `app.yaml` file generates EVERYTHING: API REST, Admin UI, Mobile (Expo), Desktop (Tauri), PWA, GraphQL, webhooks, background jobs, auth with 35 OAuth providers, audit logs, feature flags, and more.

**No route files, no migration scripts, no config files.** Everything is inferred from the YAML schema.

## Project Structure

```
my-app/
├── app.yaml           # THE single config file (everything starts here)
├── actions/           # Custom endpoint handlers (optional)
├── jobs/              # Background job definitions (optional)
├── plugins/           # Local or npm plugins (optional)
├── locales/           # i18n JSON files (optional)
├── migrations/        # Database migrations (generated)
└── public/            # Static assets (optional)
```

## Quick Install

```bash
npm install -g zorux
zorux new my-app --saas
cd my-app && zorux dev
```

## app.yaml Reference

### Top-level structure

```yaml
name: my-app              # Required
type: api|web|fullstack   # Default: api
database:
  provider: sqlite|postgres|mysql|mongodb|cloudflare-d1|supabase
  url: ":memory:"|"data.db"|"postgres://..."
auth:                     # Optional
  model: user             # Which model has auth
  registration: open|invite|admin
  roles: [admin, editor, viewer]
  defaultRole: viewer
  social:                 # 35 OAuth providers
    google:
      clientId: "..."
      clientSecret: "..."
    github:
      clientId: "..."
      clientSecret: "..."
  organization:
    enabled: true
    roles: [owner, admin, member]
models:                   # Required: at least one model
  modelName:
    fields:
      fieldName:
        type: string|text|int|float|boolean|ModelName  # ModelName = relation
        required: true|false
        unique: true|false
        default: value
        min: number        # String length or numeric minimum
        max: number        # String length or numeric maximum
        pattern: "^regex$" # Regex validation
        enum: [a, b, c]    # Allowed values
    timestamps: true       # Auto add created_at/updated_at
    softDelete: true       # Add deleted_at + restore endpoint
    auth: email|username   # Auth field for this model
    id: int|uuid           # ID type (default: int)
    scoped: true           # Multi-tenancy via X-Org-ID
    policies:              # ABAC policy engine
      create: "authenticated|*|user.role == \"admin\""
      read: "*"
      update: 'user.role == "admin" || resource.authorId == user.id'
      delete: 'user.role == "admin"'
    fieldPolicies:         # Field-level permissions
      - field: role
        readable: 'user.role == "admin"'
        writable: 'user.role == "admin"'
    derivedRoles:          # Computed roles
      - name: trusted
        condition: 'user.role == "admin" || user.role == "editor"
plugins:
  - cors                  # npm packages — auto-detected
  - helmet
```

## ABAC Policy Engine

Zorux has its own policy expression language evaluated per-request.

### Identifiers
- `user.*` — Current user's attributes (role, id, email)
- `resource.*` — The record being accessed (id, authorId, title)
- `env.now` — Current timestamp

### Operators
- `==` `!=` — Equality
- `>` `>=` `<` `<=` — Comparison
- `in` — `'role in ["admin", "owner"]'`
- `matches` — Regex: `'user.email matches "@example.com$"'`
- `exists` — Field exists: `'exists resource.published'`
- `&&` `||` — Logical AND/OR
- `!` — Negation: `'!(user.role == "viewer")'`
- `()` — Grouping: `'(role == "admin") && (status == "draft")'`

### Simple role check
```yaml
create: "admin"          # Only admin role
create: "admin,editor"   # Multiple roles
create: "authenticated"  # Any logged-in user
create: "*"              # Public (no auth required)
```

## Auto-generated API Routes

For each model (e.g., "post"):

```
GET    /api/posts                 # List (paginated, sorted, searchable)
GET    /api/posts/:id             # Get single (with field filtering)
POST   /api/posts                 # Create (validates fields)
PUT    /api/posts/:id             # Update
DELETE /api/posts/:id             # Soft delete if enabled

POST   /api/posts/:id/restore     # Restore soft-deleted
DELETE /api/posts/:id/permanent   # Permanent delete

POST   /api/posts/bulk            # Bulk create
PUT    /api/posts/bulk            # Bulk update
DELETE /api/posts/bulk            # Bulk delete

GET    /api/posts/export?format=csv|json
POST   /api/posts/import          # CSV/JSON import

GET    /api/posts?search=term     # Full-text search
GET    /api/posts?page=1&limit=20 # Pagination
GET    /api/posts?sort=title&order=asc
GET    /api/posts?fields=id,title # Field filtering
GET    /api/posts?include=author  # Include relations
```

## Auth Routes

```
POST /api/auth/register      # Register
POST /api/auth/login         # Login (returns JWT)
GET  /api/auth/me            # Current user profile
```

## Admin UI

When `type: web` or `type: fullstack`, Zorux automatically generates:
- `/admin` — Dashboard with stats, charts, activity
- `/admin/{model}` — CRUD for each model
- `/admin/emails` — Email sandbox
- `/admin/features` — Feature flags
- `/admin/monitor` — Health monitoring

The admin uses Turbo-style SPA navigation, dark/light theme, PWA support.

## Database & Storage

### 7 Database Providers
- `sqlite` — Local file or `:memory:` (no setup)
- `postgres` — PostgreSQL
- `mysql` — MySQL
- `mongodb` — MongoDB
- `cloudflare-d1` — Cloudflare D1
- `supabase` — Supabase
- `:memory:` — In-memory SQLite

### 8 Cache Providers
`memory`, `redis`, `upstash`, `memcached`, `dynamodb`, `sqlite`, `cf-kv`, `durable-objects`

### 3 Storage Providers
`local`, `s3` (AWS/MinIO/R2/Spaces), `supabase`

## Plugins

Any npm package works as a plugin. Zorux auto-detects the type:
- **Hono middleware** — function with 2 args `(c, next)`
- **Express middleware** — 3 args `(req, res, next)` → adapted via hono/compat
- **Express Router** — instance with `.stack`
- **Passport Strategy** — class with `.authenticate()`
- **install()/setup()/init()** — lifecycle hooks
- **Native KaiPlugin** — `{ name, onRoutes, onStart }`

## Key Conventions

1. **SNake case table names**: `Post` → `posts`, `Category` → `categories`
2. **CamelCase relation fields**: `author: user` → `authorId` column
3. **`_` prefix for system tables**: `_kai_jobs`, `_sessions`, `_audit_logs`
4. **UUID v7** is time-ordered, collision-resistant
5. **Lazy optional deps**: Stripe, MongoDB, Postgres drivers are `require()`d only when used
6. **Auth via JWT**: `Authorization: Bearer <token>` or `token` cookie

## CLI Commands

```bash
zorux new <name> [--api|--web|--mobile|--fullstack|--saas|--all]
zorux dev [port]
zorux gen mobile|desktop|pwa|graphql
zorux add model <Name> <field>:<type> [...]
zorux make action|job|migration <name>
zorux db migrate|rollback|reset|status
zorux seed [--count N]
zorux deploy
zorux test [--run|--e2e|--security]
zorux plugin list|add|remove
zorux console
zorux audit
```

## Example: Complete SaaS

```yaml
name: my-saas
type: fullstack
database:
  provider: sqlite
auth:
  model: user
  registration: open
  roles: [admin, editor, viewer]
  defaultRole: viewer
models:
  user:
    fields:
      name: { type: string, required: true }
      email: { type: string, required: true, unique: true }
      role: { type: string, enum: [admin, editor, viewer], default: viewer }
    auth: email
    timestamps: true
    policies:
      read: "*"
      update: 'user.role == "admin" || resource.id == user.id'
  post:
    fields:
      title: { type: string, required: true }
      content: { type: text }
      author: user
      published: { type: boolean, default: false }
    timestamps: true
    softDelete: true
    policies:
      create: authenticated
      read: "*"
      update: 'user.role == "admin" || resource.authorId == user.id'
      delete: 'user.role == "admin"'
  comment:
    fields:
      content: { type: text, required: true }
      post: post
      author: user
    timestamps: true
email:
  provider: fake
```

## Performance

- Bun + Hono: ~6,000 req/s (CRUD with auth + policy + audit)
- Prepared statement cache
- Policy AST cache  
- Password verify cache (login ~0.36ms)
- All optional deps are lazy-loaded

## Tests

```bash
zorux test              # Run all tests
zorux test --security   # Security audit test
zorux audit             # Static audit
```

371 tests, 0 failures across 21 test files.
