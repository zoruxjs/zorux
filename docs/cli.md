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
| `--api` | API-only project |
| `--web` | Web admin project |
| `--mobile` | Mobile (Expo) project |
| `--fullstack` | API + Web admin |
| `--saas` | Full SaaS (API + Admin + Auth + Payments) |
| `--all` | Everything (API + Admin + Mobile + Desktop + PWA) |
| `--ui <framework>` | UI framework: `tailwind`, `daisyui`, `antd`, `mui`, `chakra`, `mantine`, `headless` |

**Examples:**

```bash
# Create a full SaaS project
zorux new my-app --saas

# Create an API-only project
zorux new my-api --api

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
