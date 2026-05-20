# CLI Reference

The Zorux CLI provides commands for project creation, development, code generation, database management, deployment, and more.

## Installation

```bash
npm install -g zorux
```

Verify installation:

```bash
zorux version
```

## Commands

### `zorux new`

Create a new Zorux project.

```bash
zorux new <name> [options]
```

**Options:**

| Flag | Description |
|---|---|
| `--preset <name>` | Project preset: `api`, `web`, `saas`, `blog` |
| `--api` | API-only project (alias for `--preset api`) |
| `--web` | Web admin project (alias for `--preset web`) |
| `--mobile` | Mobile (Expo) project |
| `--fullstack` | API + Web admin |
| `--saas` | Full SaaS (API + Admin + Auth + Payments) (alias for `--preset saas`) |
| `--all` | Everything (API + Admin + Mobile + Desktop + PWA) |
| `--minimal` | Minimal project (no example pages) |
| `--ui <framework>` | UI framework: `tailwind`, `daisyui`, `antd`, `mui`, `chakra`, `mantine`, `headless` |

**Examples:**

```bash
# Create a full SaaS project
zorux new my-app --preset saas

# Create a blog
zorux new my-blog --preset blog

# Create an API-only project
zorux new my-api --api

# Minimal project (no web pages)
zorux new my-app --preset web --minimal

# Create with Tailwind UI
zorux new my-app --saas --ui tailwind

# Create with DaisyUI
zorux new my-app --fullstack --ui daisyui
```

### `zorux dev`

Start the development server with hot reload.

```bash
zorux dev [port]
```

**Default port:** 3000

**Hot reload watches:**
- `app.yaml` — Model changes trigger full rebuild
- `actions/*.ts` — Custom action handlers
- `jobs/*.ts` — Background job definitions
- `plugins/*.ts` — Local plugins
- `locales/*.json` — Translation files
- `views/` — Admin UI templates

**Filters:** `.yaml`, `.yml`, `.ts`, `.js`, `.tsx`, `.jsx`, `.json`, `.css`

**Ignores:** `node_modules`, `dist`

**Debounce:** 300ms

**Examples:**

```bash
# Default port 3000
zorux dev

# Custom port
zorux dev 4000
```

### `zorux gen`

Generate platform-specific code.

```bash
zorux gen <platform>
```

**Platforms:**

| Platform | Description |
|---|---|
| `mobile` | Generate Expo React Native app |
| `desktop` | Generate Tauri v2 desktop app |
| `pwa` | Generate PWA (manifest + service worker) |
| `graphql` | Generate GraphQL client code |

**Examples:**

```bash
zorux gen mobile
zorux gen desktop
zorux gen pwa
zorux gen graphql
```

### `zorux add`

Add models to `app.yaml`.

```bash
zorux add model <Name> <field>:<type> [flags...]
```

**Flags:**

| Flag | Description |
|---|---|
| `required` | Mark field as required |
| `unique` | Mark field as unique |
| `min:N` | Set minimum value/length |
| `max:N` | Set maximum value/length |
| `default:value` | Set default value |
| `enum:a,b,c` | Set enum values |
| `auth` | Make this the auth model |
| `timestamps` | Add created_at/updated_at |

**Examples:**

```bash
# Add a Post model
zorux add model Post title:string required body:text author:User

# Add with modifiers
zorux add model User name:string required email:email unique password:string auth timestamps

# Add enum field
zorux add model Post status:string enum:draft,published default:draft
```

### `zorux make`

Create boilerplate files.

```bash
zorux make action <name> <handler1> [handler2...]
zorux make job <name>
zorux make migration <name>
```

**Examples:**

```bash
# Create action file with handlers
zorux make action greet hello goodbye

# Creates actions/greet.ts with hello and goodbye exports

# Create job file
zorux make job send-welcome-email

# Creates jobs/send-welcome-email.ts

# Create migration
zorux make migration add-index-to-posts
```

### `zorux seed`

Seed the database with random data.

```bash
zorux seed [--count N] [Model:N...]
```

**Options:**

| Flag | Description |
|---|---|
| `--count N` | Default records per model (default: 5) |

**Examples:**

```bash
# Seed 5 records per model
zorux seed

# Seed 20 records per model
zorux seed --count 20

# Seed specific counts
zorux seed User:50 Post:100 Comment:200
```

### `zorux db`

Database management commands.

```bash
zorux db <command> [options]
```

**Commands:**

| Command | Description |
|---|---|
| `reset` | Delete SQLite database file |
| `migrate` | Run pending migrations |
| `migrate --auto` | Auto-detect model changes and create migration |
| `rollback` | Rollback last migration batch |
| `status` | Show migration status |
| `schema dump` | Dump current schema to `db/schema.sql` |

**Examples:**

```bash
# Reset database
zorux db reset

# Run migrations
zorux db migrate

# Auto-migrate from model changes
zorux db migrate --auto

# Rollback
zorux db rollback

# Check status
zorux db status

# Dump schema
zorux db schema dump
```

### `zorux deploy`

Deploy your application.

```bash
zorux deploy [platform]
```

**Supported platforms:** `docker`, `vercel`, `netlify`, `cloudflare`

**Examples:**

```bash
zorux deploy docker
zorux deploy vercel
zorux deploy netlify
zorux deploy cloudflare
```

### `zorux test`

Run or generate tests.

```bash
zorux test [options]
```

**Options:**

| Flag | Description |
|---|---|
| `--run` | Run existing tests |
| `--e2e` | Generate E2E tests |
| `--security` | Generate security tests |

Generates integration, validation, edge case, and security tests.

### `zorux audit`

Run a security and configuration audit.

```bash
zorux audit
```

Checks:
- JWT secret is default value
- CSP configuration
- Rate limiting enabled
- HTTPS in production
- Database credentials exposed
- Plugin security

### `zorux info`

Display project information.

```bash
zorux info
```

Shows:
- Project name
- Database provider
- Model count
- Plugin count
- Auth configuration

### `zorux docs`

Open documentation.

```bash
zorux docs [topic]
```

**Topics:** `getting-started`, `yaml`, `api`, `auth`, `admin`, `cli`, `database`, `security`, `deploy`, `plugins`, `storage`, `mobile`, `realtime`, `jobs`, `email`

### `zorux scaffold`

Generate a complete app from a template.

```bash
zorux scaffold <template> [name]
```

**Templates:**

| Template | Description |
|---|---|
| `forum` | Forum with categories, threads, posts, users |
| `blog` | Blog with posts, categories, tags, comments |
| `ecommerce` | E-commerce with products, orders, customers |
| `saas` | SaaS with subscriptions, teams, features |

**Examples:**

```bash
zorux scaffold forum my-forum
zorux scaffold blog my-blog
zorux scaffold ecommerce my-store
zorux scaffold saas my-saas
```

### `zorux console`

Interactive REPL for your application.

```bash
zorux console
```

Provides access to:
- Database adapter
- Models
- Auth functions
- Email sending
- Job submission

### `zorux runner`

Run custom scripts.

```bash
zorux runner <script>
```

Scripts are loaded from `scripts/` directory.

### `zorux plugin`

Manage plugins.

```bash
zorux plugin <command> [args...]
```

**Commands:**

| Command | Description |
|---|---|
| `list` | List installed plugins |
| `add <name>` | Add a plugin |
| `remove <name>` | Remove a plugin |

**Examples:**

```bash
zorux plugin list
zorux plugin add zorux-analytics
zorux plugin remove zorux-analytics
```

### `zorux credentials`

Manage credentials securely.

```bash
zorux credentials <command>
```

**Commands:**

| Command | Description |
|---|---|
| `setup` | Set up credential storage |
| `edit` | Edit stored credentials |
| `show` | Show credential names (not values) |

### `zorux completion`

Generate shell completion scripts.

```bash
zorux completion [shell]
```

**Shells:** `bash`, `zsh`, `fish`

**Example (bash):**

```bash
zorux completion bash >> ~/.bashrc
```

### `zorux version`

Show the installed version.

```bash
zorux version
```

### `zorux inspect`

Inspect the current project and generate a manifest.

```bash
zorux inspect [--json]
```

Without flags, prints a human-readable project summary. With `--json`, writes `.zorux/manifest.json` containing models, routes, auth config, and plugins.

### `zorux explain`

Show the full generation plan for the current project.

```bash
zorux explain [app.yaml]
```

Displays models, fields, relations, auth, routes, plugins, and files that will be generated. Accepts an optional path to an `app.yaml` file.

### `zorux verify`

Validate the project contract.

```bash
zorux verify
```

Runs 15+ checks on the project:
- app.yaml exists and is parseable
- Models defined
- Auth model exists and has required fields
- Database configured
- Package.json and node_modules present
- Unique field constraints
- Policy safety checks
- Scoped models have organization enabled
- Soft delete models have timestamps
- Plugin files exist
- Public routes without rate limiting flagged
- Semantic warnings

Exit code 1 if errors are found.

### `zorux doctor`

Full project diagnostic.

```bash
zorux doctor [--verbose]
```

Runs 14+ checks including all `verify` checks plus:
- Node/Bun version
- Port availability
- Plugins existence
- Web pages count
- Actions count
- Environment file

### `zorux context`

Generate LLM context file.

```bash
zorux context [--budget N] [--output <path>]
```

Generates a `.md` file with project context designed for AI agents.

**Options:**

| Flag | Description |
|---|---|
| `--budget 2000` | Compact version (~500 tokens) |
| `--budget 8000` | Medium version (models + policies) |
| (no flag) | Full version with all details |
| `--output .zorux/context.md` | Write to file instead of stdout |

### `zorux routes`

Show all routes with ownership information.

```bash
zorux routes
```

Output format:
```
[core:crud(User)]
  GET    /api/users
  POST   /api/users
  GET    /api/users/:id
[core:auth]
  POST   /api/auth/login
[core:admin]
  GET    /admin
```

### `zorux map`

Show file ownership map — which files are editable vs generated.

```bash
zorux map
```

### `zorux diff`

Semantic diff between current app.yaml and previous manifest.

```bash
zorux diff
```

Detects:
- Added/removed models
- New/deleted fields
- Changed policies
- Required migrations

### `zorux decisions`

Show the decision tree explaining why each feature exists.

```bash
zorux decisions
```

Output format:
```
Because type="fullstack":
  - Admin routes enabled
  - Login/register pages enabled

Because auth.model="User":
  - Auth routes: /api/auth/register, /api/auth/login
```

### `zorux ownership`

Show ownership details for a model, route, or field.

```bash
zorux ownership <model|/route|field>
```

**Examples:**
```bash
zorux ownership User         # Model ownership (fields, policies, used by)
zorux ownership /api/users   # Route ownership (core:crud, declared in)
zorux ownership email        # Field ownership (model, type, provenance)
```

### `zorux token-report`

Estimate token savings compared to traditional frameworks.

```bash
zorux token-report
```

Output example:
```
App Contract (Zorux):
  app.yaml:          830 tokens
  Custom code:      1,240 tokens
  Total Zorux:      2,070 tokens

Traditional Equivalent: 18,400 tokens
Savings: 89% less tokens
```

### `zorux snapshot`

Generate a compact project state snapshot.

```bash
zorux snapshot
```

Writes `.zorux/snapshot.md` with:
- App name, type, database
- Model list with field counts
- Route count
- Custom file count
- Warnings (missing auth, missing node_modules)

### `zorux cleanup`

Remove old framework name references across source and docs.

```bash
zorux cleanup
```

Scans `src/` and `docs/` for old names (`fw`, `Zorux.css`) and replaces them with current names.

### `zorux recipe add`

Apply a YAML recipe to the current project.

```bash
zorux recipe add <name>
```

**Available recipes (20):**

| Recipe | Description | Requires |
|---|---|---|
| `blog` | Post + Category + Comment | — |
| `teams` | Organization + Invites | auth |
| `billing` | Stripe subscriptions | auth, admin |
| `docs-site` | Doc + DocGroup + Search | auth |
| `newsletter` | Subscriber + Campaign + Template + SendLog | auth, email |
| `api-keys` | ApiKey + Scope + RateLimit | auth |
| `audit-log` | Audit trail for compliance | — |
| `waitlist` | Waitlist signup + referral codes | — |
| `ecommerce` | Product + Variant + Cart + Order + Review | auth |
| `notifications` | Templates + Channels + Preferences | auth |
| `search` | SearchIndex + Synonym + Boost | auth |
| `dashboard` | KPI definitions + Chart configs | admin |
| `pricing-page` | Plan + Feature + Tier | admin |
| `docker-deploy` | Dockerfile + docker-compose | — |
| `cdn-assets` | File upload + image optimization | storage |
| `webhooks-out` | Webhook endpoints + delivery log | auth, jobs |
| `scheduled-tasks` | Task scheduler + execution log | jobs |
| `agent-api` | Agent + Thread + Message + Run | auth |
| `content-moderation` | Report + Flag + ReviewQueue | auth, admin |
| `portfolio` | Project + Tag + Testimonial + Contact | — |

Validates requirements before applying. Creates models, updates app.yaml, and generates action/job files.

### `zorux agent init`

Generate AI agent instruction files for the project.

```bash
zorux agent init
```

Creates:
- `AGENTS.md` — Full agent instructions
- `CLAUDE.md` — Claude Code format
- `.cursor/rules/zorux.mdc` — Cursor editor rules
- `.github/copilot-instructions.md` — GitHub Copilot
- `.windsurf/rules/zorux.md` — Windsurf editor
- `.zorux/agent/README.md` — Agent instructions (copy)
- `.zorux/agent/allowed-actions.json` — Machine-readable contract

### `zorux lint agent`

Detect agent anti-patterns in the project.

```bash
zorux lint agent
```

Checks for:
- Express, Prisma, Next, Passport, bcrypt packages installed unnecessarily
- Manual CRUD routes for declared models
- Manual auth middleware
- Prisma schema files
- Custom server files

### `zorux guard install`

Preinstall hook that warns when using npm directly instead of Zorux commands.

```bash
zorux guard install
```

Adds to `package.json` scripts:
```
"preinstall": "zorux guard install"
```

### `zorux apply`

Apply a structured change YAML to the project.

```bash
zorux apply <change.yaml>
```

Change files describe intent rather than implementation. Zorux generates the correct code.

**Supported change types:**

| Type | Description |
|---|---|
| `add_model` | Add a new model with fields and policies |
| `add_field` | Add a field to an existing model |
| `add_recipe` | Apply a recipe by name |
| `add_action` | Create a custom action file |
| `add_page` | Create a DaisyUI page |

**Example:**

```yaml
# change.yaml
change:
  type: add_model
  model: Invoice
  fields:
    amount: number required
    status: string enum:draft,paid,void
  timestamps: true
  policies:
    create: authenticated
    list: owner
  admin:
    columns: [amount, status, created_at]
```

```bash
zorux apply change.yaml
```

Also accepts stdin:
```bash
cat change.yaml | zorux apply -
```

### `zorux lint ai`

Detect AI-generated code anti-patterns in the project.

```bash
zorux lint ai
```

**15+ checks:**

| Check | Severity |
|---|---|
| Manual CRUD route for declared model | error |
| Express/Fastify installed unnecessarily | error |
| Prisma/Drizzle duplicating app.yaml | error |
| Auth libraries (passport, bcrypt, JWT) installed | warn |
| `any` used excessively in actions/plugins | warn |
| Empty `catch {}` block | warn |
| File >300 lines | warn |
| Hardcoded secrets detected | error |
| `fetch()` without SDK client | warn |
| Raw SQL without prepared statement | warn |
| Public route without rate limiting | warn |
| Generated file edited | warn |

### `zorux quality`

Show code quality metrics and AI risk score.

```bash
zorux quality
```

Output:
```
Generated: 5 models → 64 routes
Custom code: 4 files, 1,240 lines
Manual routes: 3
External packages: 8
Test files: 12

AI Risk Score: 15/100 (low)
```

### `zorux review`

Heuristic diff review of staged changes.

```bash
zorux review
```

Checks:
- New public routes without rate limiting
- Routes duplicating generated CRUD
- Models without dedicated tests
- Public create without validation
- New npm packages that duplicate built-in functionality

### `zorux fix ai`

Apply automatic codemods to fix common issues.

```bash
zorux fix ai
```

**Automatic fixes:**
- Replaces empty `catch {}` with `catch (err) { console.error(...) }`
- Adds `JWT_SECRET` to `.env` if missing
- Reports excessive `any` usage for manual review

### `zorux add field`

Add a field to an existing model.

```bash
zorux add field <model> <field>:<type> [flags...]
```

**Examples:**
```bash
zorux add field Post summary:text required
zorux add field User age:int required max:120
zorux add field Subscriber email:email unique
```

### `zorux add page`

Generate a new DaisyUI page.

```bash
zorux add page <name>
```

Creates `web/pages/<name>.tsx` with:
- DaisyUI navbar
- Hero section
- Responsive layout
Auto-registered at `GET /<name>`.

### `zorux add package`

Install an npm package and register it as a Zorux provider.

```bash
zorux add package <npm-package>
```

Known packages automatically update `app.yaml`:

| Package | Provider config |
|---|---|
| `stripe` | `payments.provider: stripe` |
| `resend` | `email.provider: resend` |
| `ioredis` | `cache.provider: redis` |
| `pg` | `database.provider: postgres` |
| `mongodb` | `database.provider: mongodb` |
| `@aws-sdk/client-s3` | `storage.provider: s3` |

Other packages are installed normally (without app.yaml changes).

### `zorux add plugin`

Scaffold a new plugin file.

```bash
zorux add plugin <name>
```

Creates `plugins/<name>.ts` with a basic plugin template and registers it in `app.yaml`.

## Shell Completion

### Bash

```bash
zorux completion bash >> ~/.bashrc
source ~/.bashrc
```

### Zsh

```bash
zorux completion zsh >> ~/.zshrc
source ~/.zshrc
```

### Fish

```bash
zorux completion fish >> ~/.config/fish/completions/zorux.fish
```

## Environment Variables

The CLI respects these environment variables:

| Variable | Description |
|---|---|
| `JWT_SECRET` | JWT signing secret |
| `DATABASE_URL` | Database connection string |
| `REDIS_URL` | Redis connection URL |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `RESEND_API_KEY` | Resend API key |
| `SENDGRID_API_KEY` | SendGrid API key |
| `S3_BUCKET` | S3 bucket name |
| `S3_REGION` | S3 region |
| `S3_ACCESS_KEY` | S3 access key |
| `S3_SECRET_KEY` | S3 secret key |
