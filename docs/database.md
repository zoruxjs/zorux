# Database

<!-- maturity: ✅ Stable -->
> **✅ Stable** — This feature is ready for production


Zorux supports 7 database providers with a unified adapter interface. Switch providers by changing one line in `app.yaml`.

## Configuration

```yaml
database:
  provider: sqlite              # Required
  url: string                   # For non-SQLite providers
```

## Providers

### SQLite (Default)

Local file-based database. No setup required.

```yaml
database:
  provider: sqlite
```

**Features:**
- WAL mode enabled for better concurrency
- Prepared statement cache for performance
- Auto-creates `db/app.db` on first run

**Environment:** No env vars needed.

### In-Memory SQLite

For testing — data is lost on restart.

```yaml
database:
  provider: ":memory:"
```

### PostgreSQL

```yaml
database:
  provider: postgres
  url: "postgres://user:password@localhost:5432/myapp"
```

**Package:** `postgres` (npm) — lazy loaded

**URL Format:** `postgres://[user]:[password]@[host]:[port]/[database]`

**Environment Variable:** `DATABASE_URL`

### MySQL

```yaml
database:
  provider: mysql
  url: "mysql://user:password@localhost:3306/myapp"
```

**Package:** `mysql2/promise` (npm) — lazy loaded

**URL Format:** `mysql://[user]:[password]@[host]:[port]/[database]`

**Environment Variable:** `DATABASE_URL`

### MongoDB

```yaml
database:
  provider: mongodb
  url: "mongodb://user:password@localhost:27017/myapp"
```

**Package:** `mongodb` (npm) — lazy loaded

**URL Format:** `mongodb://[user]:[password]@[host]:[port]/[database]`

**Environment Variable:** `DATABASE_URL`

**Notes:**
- Uses collections instead of tables
- ObjectId conversion handled automatically
- `_id` field mapped to `id`

### Cloudflare D1

```yaml
database:
  provider: cloudflare-d1
```

**Integration:** Uses Cloudflare D1 REST API

**Environment Variables:**
- `CF_ACCOUNT_ID` — Cloudflare account ID
- `CF_D1_DATABASE_ID` — D1 database ID
- `CF_API_TOKEN` — Cloudflare API token

### Supabase

```yaml
database:
  provider: supabase
  url: "postgresql://user:password@host:5432/postgres"
```

Uses Supabase's PostgreSQL instance. Same as `postgres` provider but with Supabase-specific optimizations.

## Adapter Interface

All providers implement the `DatabaseAdapter` interface:

```typescript
interface DatabaseAdapter {
  collection(tableName: string, model?: CompiledModel): DataCollection
  run(sql: string, params?: any[]): void
  get?(sql: string, params?: any[]): any
  all?(sql: string, params?: any[]): any[]
  connect(): Promise<void>
  close(): void
}
```

## Collection Interface

```typescript
interface DataCollection {
  find(sort?, order?, limit?, offset?): any[]
  findById(id): any
  findBy(field, value): any
  insert(data): any
  update(id, data): void
  deleteById(id): void
  count(): number
  search(fields, term, sort?, order?, limit?, offset?): { rows, total }
}
```

## Schema Generation

Zorux auto-generates database schemas from your models on startup.

### Column Types

| YAML Type | SQLite | PostgreSQL | MySQL | MongoDB |
|---|---|---|---|---|
| `string` | TEXT | VARCHAR(255) | VARCHAR(255) | String |
| `text` | TEXT | TEXT | TEXT | String |
| `int` | INTEGER | INTEGER | INT | Int |
| `float` | REAL | REAL | FLOAT | Float |
| `bool` | INTEGER (0/1) | BOOLEAN | TINYINT(1) | Boolean |
| `email` | TEXT | VARCHAR(255) | VARCHAR(255) | String |
| `file` | TEXT | TEXT | TEXT | String |

### ID Types

| ID Type | SQLite | PostgreSQL | MySQL |
|---|---|---|---|
| `int` (default) | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` | `INT AUTO_INCREMENT PRIMARY KEY` |
| `uuid` | `TEXT PRIMARY KEY` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | `VARCHAR(36) PRIMARY KEY` |

### Auto-Generated Columns

| Column | When Added | Type |
|---|---|---|
| `created_at` | `timestamps: true` | DATETIME |
| `updated_at` | `timestamps: true` | DATETIME |
| `deleted_at` | `softDelete: true` | DATETIME |
| `{field}Id` | Relation field | FK type |
| `password` | `auth: password` | TEXT |

### Foreign Keys

Relations create foreign key constraints:

```yaml
models:
  Post:
    fields:
      author: User    # Creates authorId INTEGER REFERENCES users(id)
```

## Migrations

Migrations are stored in the `migrations/` directory.

### File Format

**SQL migrations:**

```sql
-- migrations/20260101000000_add_index.sql
CREATE INDEX idx_posts_status ON posts(status);
```

**TypeScript migrations:**

```typescript
// migrations/20260101000000_add_index.ts
export function up(db: DatabaseAdapter) {
  db.run("CREATE INDEX idx_posts_status ON posts(status)")
}

export function down(db: DatabaseAdapter) {
  db.run("DROP INDEX idx_posts_status")
}
```

### Migration Tracking

Migrations are tracked in the `_migrations` table:

| Column | Type |
|---|---|
| `id` | INTEGER PRIMARY KEY |
| `name` | TEXT (migration filename) |
| `batch` | INTEGER (batch number) |
| `executed_at` | DATETIME |

### CLI Commands

```bash
# Run pending migrations
zorux db migrate

# Auto-detect model changes and create migration
zorux db migrate --auto

# Rollback last batch
zorux db rollback

# Show migration status
zorux db status

# Dump schema to SQL
zorux db schema dump
```

### Auto-Migration

The `--auto` flag compares your current models against the database schema and generates migrations for:

- New tables
- New columns
- Changed column types
- New indexes
- New foreign keys

## System Tables

Zorux creates these internal tables:

| Table | Purpose |
|---|---|
| `_migrations` | Migration tracking |
| `_sessions` | Auth sessions and refresh tokens |
| `_audit_logs` | Audit trail for all mutations |
| `_notifications` | User notifications |
| `_feature_flags` | Feature flag key/value pairs |
| `_webhooks` | Webhook registrations |
| `_social_accounts` | Linked OAuth accounts |
| `_oauth_clients` | OAuth client applications |
| `_oauth_codes` | Authorization codes |
| `_oauth_tokens` | OAuth access/refresh tokens |
| `_webauthn_credentials` | Passkey credentials |
| `_totp_secrets` | 2FA TOTP secrets |
| `_auth_tokens` | Password reset, magic link, OTP tokens |
| `_api_keys` | API key hashes |
| `_organizations` | Organization records |
| `_org_members` | Organization memberships |
| `_org_invites` | Pending invitations |
| `_kai_jobs` | Background job queue |

## Prepared Statement Cache (SQLite)

SQLite queries use a prepared statement cache for performance:

```typescript
// First call: prepares and caches
const stmt = schema.sqlite.prepare("SELECT * FROM posts WHERE id = ?")

// Subsequent calls: uses cached statement
const post = stmt.get(1)
```

## Connection Management

### Connect

```typescript
const adapter = createDatabaseAdapter(config)
await adapter.connect()
```

### Close

```typescript
adapter.close()
```

Called on server shutdown for clean disconnect.

## Switching Providers

To switch from SQLite to PostgreSQL:

```yaml
# Before
database:
  provider: sqlite

# After
database:
  provider: postgres
  url: "postgres://user:pass@localhost:5432/myapp"
```

No code changes needed. The adapter interface is provider-agnostic.
