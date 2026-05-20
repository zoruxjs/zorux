# YAML Reference

The `app.yaml` file is the single source of truth for your entire application. Every model, auth configuration, database setting, plugin, and integration is defined here.

## Top-Level Structure

```yaml
name: string                    # Application name
type: string                    # App type: api | web | mobile | fullstack
provider: string                # Platform provider (default: "Zorux")
database: DatabaseDef           # Database configuration
models: Record<string, ModelDef>  # Model definitions
auth: AuthDef                   # Authentication configuration
routes: Record<string, any>     # Custom route definitions
realtime: RealtimeDef           # WebSocket/real-time config
theme: ThemeDef                 # UI theme configuration
supabase: SupabaseDef           # Supabase integration
storage: StorageDef             # File storage configuration
plugins: string[]               # Plugin names (npm or local)
pluginConfig: PluginConfig      # Per-plugin configuration
cache: CacheDef                 # Cache configuration
i18n: I18nDef                   # Internationalization
email: EmailDef                 # Email provider configuration
payments: PaymentsDef           # Payment provider configuration
search: SearchDef               # Search engine configuration
captcha: CaptchaDef             # Captcha configuration
```

## Database

```yaml
database:
  provider: sqlite              # Required: sqlite | postgres | mysql | mongodb | cloudflare-d1 | cf-d1 | supabase | :memory:
  url: string                   # Connection string (for non-SQLite providers)
```

### Provider Details

| Provider | Description | URL Format |
|---|---|---|
| `sqlite` | Local SQLite file (default) | Path to `.db` file |
| `:memory:` | In-memory SQLite (testing) | — |
| `postgres` | PostgreSQL | `postgres://user:pass@host:5432/db` |
| `mysql` | MySQL | `mysql://user:pass@host:3306/db` |
| `mongodb` | MongoDB | `mongodb://user:pass@host:27017/db` |
| `cloudflare-d1` | Cloudflare D1 | Uses Cloudflare API |
| `supabase` | Supabase PostgreSQL | `postgresql://user:pass@host:5432/db` |

### Examples

```yaml
# SQLite (default)
database:
  provider: sqlite

# PostgreSQL
database:
  provider: postgres
  url: "postgres://postgres:password@localhost:5432/myapp"

# MongoDB
database:
  provider: mongodb
  url: "mongodb://localhost:27017/myapp"

# Cloudflare D1
database:
  provider: cloudflare-d1
```

## Models

Models are the core of your application. Each model becomes a database table and a set of REST API endpoints.

```yaml
models:
  ModelName:
    fields:
      fieldName: type [modifiers...]
    auth: password              # Makes this the auth model
    timestamps: true            # Auto created_at/updated_at (default: true)
    policies:                   # Access control policies
      list: string
      read: string
      create: string
      update: string
      delete: string
    fieldPolicies:              # Field-level access control
      - field: string
        readable: string
        writable: string
    derivedRoles:               # Dynamic role computation
      - name: string
        condition: string
    scoped: true                # Multi-tenant (org-scoped)
    id: int | uuid              # ID type (default: int)
    softDelete: true            # Soft delete with deleted_at
```

### Field Types

| Type | Description | Example |
|---|---|---|
| `string` | VARCHAR(255) | `title: string` |
| `text` | TEXT | `body: text` |
| `int` | INTEGER | `count: int` |
| `float` | REAL/FLOAT | `price: float` |
| `bool` | BOOLEAN | `active: bool` |
| `email` | VARCHAR with email validation | `email: email` |
| `file` | File upload field | `avatar: file` |

### Field Modifiers

| Modifier | Description | Example |
|---|---|---|
| `required` | NOT NULL constraint | `title: string required` |
| `unique` | UNIQUE constraint | `slug: string unique` |
| `min:N` | Minimum value/length | `age: int min:18` |
| `max:N` | Maximum value/length | `title: string max:200` |
| `default:value` | Default value | `status: string default:draft` |
| `pattern:regex` | Regex validation | `code: string pattern:^[A-Z]{3}$` |
| `enum:a,b,c` | Enum constraint | `status: string enum:draft,published` |

### Relations

Relations to other models are defined by referencing the model name:

```yaml
models:
  Post:
    fields:
      title: string
      author: User              # belongsTo — creates authorId FK
      tags: Tag[]               # manyToMany — creates join table
      comments: Comment[]       # hasMany — creates postId on Comment
```

| Syntax | Relation Type | Creates |
|---|---|---|
| `ModelName` | belongsTo | `{fieldName}Id` foreign key |
| `ModelName[]` | hasMany / manyToMany | Depends on inverse side |

### Complete Model Example

```yaml
models:
  Post:
    fields:
      title: string required min:3 max:200
      slug: string unique
      body: text required
      status: string enum:draft,published,archived default:draft
      price: float min:0
      views: int default:0
      published: bool default:false
      coverImage: file
      author: User
      category: Category
      tags: Tag[]
    timestamps: true
    policies:
      list: public
      read: public
      create: authenticated
      update: "resource.authorId == user.id || user.role == 'admin'"
      delete: "user.role == 'admin'"
    fieldPolicies:
      - field: price
        readable: "user.role == 'admin' || user.role == 'editor'"
        writable: "user.role == 'admin'"
    derivedRoles:
      - name: editor
        condition: "user.role == 'admin' || user.role == 'editor'"

  User:
    fields:
      name: string required
      email: email required unique
      password: string
      avatar: file
      role: string enum:admin,editor,user default:user
    auth: password
      timestamps: true
```

### Hooks

Lifecycle hooks allow running custom code before and after CRUD operations on a model.

```yaml
models:
  Post:
    fields:
      title: string required
      body: text required
    hooks:
      beforeCreate: actions/validate-post.ts
      afterCreate: actions/notify-subscribers.ts
      beforeUpdate: actions/audit-changes.ts
      afterUpdate: actions/reindex-search.ts
      beforeDelete: actions/backup-record.ts
      afterDelete: actions/cleanup-assets.ts
```

**Available hooks:**

| Hook | Timing | Context passed |
|---|---|---|
| `beforeCreate` | Before record is inserted | `{ c, body, model }` |
| `afterCreate` | After record is inserted | `{ c, body, created, model }` |
| `beforeUpdate` | Before record is updated | `{ c, id, body, existing, model }` |
| `afterUpdate` | After record is updated | `{ c, id, body, existing, updated, model }` |
| `beforeDelete` | Before record is deleted | `{ c, id, existing, model }` |
| `afterDelete` | After record is deleted | `{ c, id, existing, model }` |

Each hook handler is an action file exported as a default function or named `handler`. Throwing an error aborts the operation.

**Example hook handler (actions/validate-post.ts):**

```ts
import { F } from "zorux"

export default async function validatePost(ctx: { body: any }) {
  if (!ctx.body.title || ctx.body.title.length < 5) {
    throw new Error("Title must be at least 5 characters")
  }
  if (!ctx.body.slug) {
    ctx.body.slug = ctx.body.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  }
}
```

## Authentication

```yaml
auth:
  model: string                 # Model name that handles auth (e.g., "User")
  registration: open            # open | invite | admin
  roles: string[]               # Available roles
  defaultRole: string           # Default role on signup
  passwordMinLength: number     # Minimum password length (default: 8)
  sessionExpiry: number         # Session expiry in hours (default: 24)
  refreshTokenExpiry: number    # Refresh token expiry in days (default: 30)
  social:                       # OAuth providers
    google:
      clientId: string
      clientSecret: string
      redirectUri: string
    github:
      clientId: string
      clientSecret: string
  organization:
    enabled: boolean
    roles: string[]
    inviteExpiresIn: number     # Days (default: 7)
```

### Registration Modes

| Mode | Description |
|---|---|
| `open` | Anyone can register |
| `invite` | Only invited users can register |
| `admin` | Only admins can create accounts |

### OAuth Providers

All 36 supported providers:

```yaml
auth:
  social:
    google: { clientId, clientSecret, redirectUri }
    github: { clientId, clientSecret }
    discord: { clientId, clientSecret }
    apple: { clientId, clientSecret, teamId, keyId, privateKey }
    facebook: { clientId, clientSecret }
    twitter: { clientId, clientSecret }
    linkedin: { clientId, clientSecret }
    microsoft: { clientId, clientSecret }
    slack: { clientId, clientSecret }
    spotify: { clientId, clientSecret }
    twitch: { clientId, clientSecret }
    reddit: { clientId, clientSecret }
    discord: { clientId, clientSecret }
    # ... and 24 more: atlassian, cognito, dropbox, figma, gitlab,
    # huggingface, kakao, kick, line, linear, naver, notion, paybin,
    # paypal, polar, railway, roblox, salesforce, tiktok, vercel, vk,
    # wechat, zoom
```

### Organization/Teams

```yaml
auth:
  organization:
    enabled: true
    roles: [owner, admin, member]
    inviteExpiresIn: 7
```

Enables multi-organization support with invites, roles, and scoped models.

## Policies (ABAC/RBAC)

Policies control access to each CRUD operation. They support both simple role strings and complex expressions.

### Built-in Policy Keywords

| Keyword | Description |
|---|---|
| `public` | Anyone can access |
| `authenticated` | Must be logged in |
| `owner` | Must own the resource (matches `{field}Id` to `user.id`) |
| Role string | Must have this role (e.g., `"admin"`, `"editor"`) |

### Expression Operators

| Operator | Description | Example |
|---|---|---|
| `==` | Equality | `user.role == "admin"` |
| `!=` | Inequality | `user.role != "banned"` |
| `>`, `>=`, `<`, `<=` | Comparison | `resource.price > 0` |
| `&&` | AND | `user.role == "admin" && resource.active` |
| `\|\|` | OR | `user.role == "admin" \|\| user.role == "editor"` |
| `!` | NOT | `!resource.deleted` |
| `in` | Array membership | `user.role in ["admin", "editor"]` |
| `matches` | Regex match | `user.email matches ".*@company\\.com"` |
| `contains` | String contains | `resource.title contains "draft"` |
| `exists` | Field exists | `resource.authorId exists` |

### Scopes

| Scope | Description |
|---|---|
| `user.*` | Current user fields (`user.id`, `user.role`, `user.email`) |
| `resource.*` | Target resource fields (`resource.authorId`, `resource.status`) |
| `env.*` | Environment context (`env.now`, `env.ip`) |

### Examples

```yaml
policies:
  list: public
  read: authenticated
  create: "user.role == 'admin' || user.role == 'editor'"
  update: "resource.authorId == user.id && resource.status != 'published'"
  delete: "user.role == 'admin' || (resource.authorId == user.id && user.role == 'editor')"
```

### Field-Level Policies

```yaml
fieldPolicies:
  - field: email
    readable: "user.role == 'admin' || resource.id == user.id"
    writable: "user.role == 'admin'"
  - field: salary
    readable: "user.role == 'admin'"
    writable: "user.role == 'admin'"
```

### Derived Roles

```yaml
derivedRoles:
  - name: editor
    condition: "user.role == 'admin' || user.role == 'editor'"
  - name: author
    condition: "resource.authorId == user.id"
```

## Real-time

```yaml
realtime:
  enabled: true
  channels:
    posts: "posts.*"
    comments: "comments.*"
```

Enables WebSocket pub/sub. Auto-publishes events on CRUD operations.

## Theme

```yaml
theme:
  framework: tailwind           # default | tailwind | daisyui | antd | mui | chakra | mantine | headless
  primary: "#3b82f6"            # Primary color
  mode: dark                    # light | dark | auto
  font: Inter                   # Font family
  radius: 0.5rem                # Border radius
```

## Storage

```yaml
storage:
  provider: local               # local | s3
  s3:
    endpoint: string            # S3 endpoint (for MinIO, R2, etc.)
    region: string              # AWS region
    bucket: string              # Bucket name
    accessKey: string           # Access key
    secretKey: string           # Secret key
    publicUrl: boolean          # Return public URLs
```

### S3 Environment Variables

| Variable | Description |
|---|---|
| `S3_ENDPOINT` | Custom endpoint (optional) |
| `S3_REGION` | AWS region |
| `S3_BUCKET` | Bucket name |
| `S3_ACCESS_KEY` | Access key |
| `S3_SECRET_KEY` | Secret key |

## Cache

```yaml
cache:
  provider: memory              # memory | redis | upstash | memcached | dynamodb | sqlite | cf-kv | cf-do
  url: string                   # Connection URL (for Redis, etc.)
  ttl: 60                       # Default TTL in seconds
```

### Cache Providers

| Provider | Env Vars | Description |
|---|---|---|
| `memory` | — | In-memory LRU cache |
| `redis` | `REDIS_URL` | Redis/Valkey/KeyDB/Dragonfly |
| `upstash` | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash Serverless Redis |
| `memcached` | `MEMCACHED_HOST`, `MEMCACHED_PORT` | Memcached |
| `dynamodb` | `DYNAMODB_CACHE_TABLE`, `AWS_REGION` | DynamoDB table |
| `sqlite` | `SQLITE_CACHE_PATH` | SQLite file |
| `cf-kv` | `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_API_TOKEN` | Cloudflare KV |
| `cf-do` | `CF_DO_NAMESPACE_ID` | Cloudflare Durable Objects |

## i18n

```yaml
i18n:
  defaultLocale: en             # Default locale
  locales: [en, pt-BR, es, fr]  # Supported locales
  cookieName: lang              # Cookie name for locale
```

Translation files go in `locales/{locale}.json`.

## Email

```yaml
email:
  provider: fake                # fake | log | resend | sendgrid | smtp
  from: string                  # Default from address
  resend:
    apiKey: string
  sendgrid:
    apiKey: string
  smtp:
    host: string
    port: number
    secure: boolean
    user: string
    pass: string
```

### Email Providers

| Provider | Description | Env Vars |
|---|---|---|
| `fake` | In-memory sandbox (admin UI viewer) | — |
| `log` | Console.log only | — |
| `resend` | Resend API | `RESEND_API_KEY` |
| `sendgrid` | SendGrid API | `SENDGRID_API_KEY` |
| `smtp` | SMTP via Nodemailer | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |

## Payments

```yaml
payments:
  provider: stripe              # stripe | polar
  stripe:
    secretKey: string
    webhookSecret: string
  polar:
    token: string
```

### Payment Environment Variables

| Variable | Provider | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe | Secret API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signing secret |
| `POLAR_TOKEN` | Polar | API token |

## Search

```yaml
search:
  provider: meilisearch
  url: string                   # Meilisearch URL
  apiKey: string                # Meilisearch API key
```

Auto-indexes models on CRUD. Provides full-text search endpoints.

## Captcha

```yaml
captcha:
  provider: turnstile           # turnstile | recaptcha
  siteKey: string               # Site key (frontend)
  secretKey: string             # Secret key (backend)
```

### Captcha Environment Variables

| Variable | Provider |
|---|---|
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile |
| `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA |

## Supabase

```yaml
supabase:
  url: string                   # Supabase project URL
  anonKey: string               # Supabase anon key
  serviceKey: string            # Supabase service role key
```

## Plugins

```yaml
plugins:
  - my-local-plugin             # Loads from plugins/my-local-plugin.ts
  - zorux-analytics             # Loads from npm package zorux-analytics

pluginConfig:
  zorux-analytics:
    trackingId: UA-XXXXX
    enabled: true
```

### Plugin Loading

| Format | Source |
|---|---|
| `my-plugin` | `plugins/my-plugin.ts` or `plugins/my-plugin/index.ts` |
| `npm-package` | npm package `npm-package` (tries `zorux-plugin-npm-package` first, falls back to `kai-plugin-npm-package` for legacy compat) |

## Complete Example

```yaml
name: blog-platform
type: fullstack
database:
  provider: postgres
  url: "postgres://postgres:pass@localhost:5432/blog"

models:
  User:
    fields:
      name: string required
      email: email required unique
      avatar: file
      role: string enum:admin,editor,subscriber default:subscriber
    auth: password
    timestamps: true

  Post:
    fields:
      title: string required min:3 max:200
      slug: string unique
      body: text required
      status: string enum:draft,published default:draft
      coverImage: file
      author: User
      category: Category
      tags: Tag[]
    timestamps: true
    policies:
      list: public
      read: public
      create: authenticated
      update: owner
      delete: admin

  Category:
    fields:
      name: string required unique
      description: text
    timestamps: true

  Tag:
    fields:
      name: string required unique
    timestamps: true

  Comment:
    fields:
      body: text required
      author: User
      post: Post
    timestamps: true
    policies:
      create: authenticated
      update: owner
      delete: "user.role == 'admin' || resource.authorId == user.id"

auth:
  model: User
  registration: open
  roles: [admin, editor, subscriber]
  defaultRole: subscriber
  social:
    google:
      clientId: ${GOOGLE_CLIENT_ID}
      clientSecret: ${GOOGLE_CLIENT_SECRET}
    github:
      clientId: ${GITHUB_CLIENT_ID}
      clientSecret: ${GITHUB_CLIENT_SECRET}
  organization:
    enabled: false

cache:
  provider: redis
  url: ${REDIS_URL}
  ttl: 120

storage:
  provider: s3
  s3:
    bucket: blog-uploads
    region: us-east-1

email:
  provider: resend
  from: "noreply@blog.com"

realtime:
  enabled: true

search:
  provider: meilisearch
  url: http://localhost:7700

i18n:
  defaultLocale: en
  locales: [en, pt-BR]

theme:
  framework: tailwind
  primary: "#3b82f6"
  mode: dark

plugins:
  - zorux-analytics
  - my-custom-plugin

pluginConfig:
  zorux-analytics:
    trackingId: UA-XXXXX
```
