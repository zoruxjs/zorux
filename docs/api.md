# API Reference

Every model in your `app.yaml` automatically generates a complete REST API with CRUD operations, pagination, search, sorting, bulk operations, import/export, and more.

## Base URL

All API endpoints are prefixed with `/api`.

```
GET /api/posts
GET /api/posts/1
POST /api/posts
```

## API Info

```
GET /api
```

Returns application info and list of available models.

```json
{
  "name": "my-app",
  "models": ["posts", "users", "categories"]
}
```

## OpenAPI / Swagger

```
GET /api/openapi.json    # OpenAPI 3.0 specification
GET /api/docs            # Swagger UI (interactive)
```

## CRUD Endpoints

For a model named `Post` (table name: `posts`):

### List Records

```
GET /api/posts
```

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max: 100) |
| `search` | string | — | Full-text search across string/text fields |
| `sort` | string | `id` | Field to sort by |
| `order` | string | `desc` | Sort order: `asc` or `desc` |
| `include` | string | — | Comma-separated relations to include |

**Response:**

```json
{
  "rows": [
    { "id": 1, "title": "Hello", "body": "World", "createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2026-01-01T00:00:00Z" }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Examples:**

```bash
# First page, 10 items
GET /api/posts?page=1&limit=10

# Search for "hello"
GET /api/posts?search=hello

# Sort by title ascending
GET /api/posts?sort=title&order=asc

# Include author relation
GET /api/posts?include=author

# Combined
GET /api/posts?page=2&limit=5&search=world&sort=created_at&order=desc
```

### Get Record by ID

```
GET /api/posts/:id
```

**Response:**

```json
{
  "id": 1,
  "title": "Hello",
  "body": "World",
  "authorId": 1,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

### Create Record

```
POST /api/posts
Content-Type: application/json

{
  "title": "New Post",
  "body": "Post content",
  "authorId": 1
}
```

**Response:** Returns the created record.

### Update Record

```
PUT /api/posts/:id
Content-Type: application/json

{
  "title": "Updated Title"
}
```

**Response:** Returns the updated record.

### Delete Record

```
DELETE /api/posts/:id
```

**Response:** `204 No Content`

If `softDelete: true` is set, this performs a soft delete (sets `deleted_at`).

## Soft Delete Endpoints

When `softDelete: true` is set on a model:

### Restore Soft-Deleted Record

```
POST /api/posts/:id/restore
```

### Permanent Delete

```
DELETE /api/posts/:id/permanent
```

## Bulk Operations

### Bulk Create

```
POST /api/posts/bulk
Content-Type: application/json

[
  { "title": "Post 1", "body": "Content 1" },
  { "title": "Post 2", "body": "Content 2" }
]
```

### Bulk Update

```
PUT /api/posts/bulk
Content-Type: application/json

{
  "ids": [1, 2, 3],
  "data": { "status": "published" }
}
```

### Bulk Delete

```
DELETE /api/posts/bulk
Content-Type: application/json

{ "ids": [1, 2, 3] }
```

## Import / Export

### Export

```
GET /api/posts/export?format=json
GET /api/posts/export?format=csv
GET /api/posts/export?format=xlsx
```

**Formats:**
- `json` — JSON array of records
- `csv` — CSV with headers
- `xlsx` — Excel spreadsheet

### Import

```
POST /api/posts/import
Content-Type: multipart/form-data

file: <JSON/CSV/XLSX file>
```

**Supported formats:** JSON, CSV, XLSX (multipart file upload)

**JSON body alternative:**

```
POST /api/posts/import
Content-Type: application/json

[
  { "title": "Post 1", "body": "Content 1" },
  { "title": "Post 2", "body": "Content 2" }
]
```

## Authentication Endpoints

### Register

```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "token": "eyJhbGci...",
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com" }
}
```

### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** Same as register.

### Get Current User

```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user"
}
```

### Refresh Token

```
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJhbGci..." }
```

### Forgot Password

```
POST /api/auth/forgot-password
Content-Type: application/json

{ "email": "john@example.com" }
```

Sends a password reset email with a token.

### Reset Password

```
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

### Email Verification

```
POST /api/auth/send-verification
Authorization: Bearer <token>
```

Sends a verification email.

```
GET /api/auth/verify-email?token=<token>
```

Verifies email and returns new JWT.

### Magic Link

```
POST /api/auth/magic-link/send
Content-Type: application/json

{ "email": "john@example.com" }
```

```
GET /api/auth/magic-link?token=<token>
```

Logs in via magic link.

### Email OTP

```
POST /api/auth/otp/send
Content-Type: application/json

{ "email": "john@example.com" }
```

```
POST /api/auth/otp/verify
Content-Type: application/json

{
  "email": "john@example.com",
  "code": "123456"
}
```

### Sessions

```
GET /api/auth/sessions
Authorization: Bearer <token>
```

Lists all active sessions.

```
DELETE /api/auth/sessions/:id
Authorization: Bearer <token>
```

Revokes a specific session.

```
POST /api/auth/sessions/revoke-all
Authorization: Bearer <token>
```

Revokes all sessions.

## 2FA / TOTP

### Setup

```
POST /api/auth/2fa/setup
Authorization: Bearer <token>
```

**Response:**

```json
{
  "secret": "base32secret",
  "base32": "BASE32SECRET",
  "otpauth": "otpauth://totp/..."
}
```

### Confirm

```
POST /api/auth/2fa/confirm
Authorization: Bearer <token>
Content-Type: application/json

{ "code": "123456" }
```

### Disable

```
POST /api/auth/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json

{ "code": "123456" }
```

## WebAuthn / Passkeys

### Register

```
POST /api/auth/webauthn/register/begin
Authorization: Bearer <token>
```

Returns challenge for registration.

```
POST /api/auth/webauthn/register/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "credential-id",
  "rawId": "...",
  "response": { ... },
  "type": "public-key"
}
```

### Authenticate

```
POST /api/auth/webauthn/auth/begin
Content-Type: application/json

{ "email": "john@example.com" }
```

```
POST /api/auth/webauthn/auth/complete
Content-Type: application/json

{
  "id": "credential-id",
  "rawId": "...",
  "response": { ... },
  "type": "public-key"
}
```

### Manage Credentials

```
GET /api/auth/webauthn/credentials
Authorization: Bearer <token>

DELETE /api/auth/webauthn/credentials/:id
Authorization: Bearer <token>
```

## API Keys

### Create

```
POST /api/auth/api-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My API Key",
  "expiresAt": "2027-01-01T00:00:00Z"  // optional
}
```

**Response:**

```json
{
  "id": 1,
  "name": "My API Key",
  "key": "Zorux_xxxxxxxxxxxxxxxx...",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

> **Note:** The full key is only shown once. Store it securely.

### List

```
GET /api/auth/api-keys
Authorization: Bearer <token>
```

### Revoke

```
DELETE /api/auth/api-keys/:id
Authorization: Bearer <token>
```

### Using API Keys

```
GET /api/posts
Authorization: Bearer Zorux_xxxxxxxxxxxxxxxx...
```

## Social / OAuth Login

### Authorize

```
GET /api/auth/social/google/authorize
```

Redirects to Google OAuth.

### Callback

```
GET /api/auth/social/google/callback?code=xxx&state=xxx
```

Handles OAuth callback and returns JWT.

### Link Account

```
POST /api/auth/social/link
Authorization: Bearer <token>
Content-Type: application/json

{ "provider": "github", "code": "xxx" }
```

### List Linked Accounts

```
GET /api/auth/social/accounts
Authorization: Bearer <token>
```

## Organizations

### Create

```
POST /api/auth/orgs
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "My Company", "slug": "my-company" }
```

### List My Orgs

```
GET /api/auth/orgs
Authorization: Bearer <token>
```

### Get Org

```
GET /api/auth/orgs/:id
Authorization: Bearer <token>
```

### Update Org

```
PUT /api/auth/orgs/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "New Name" }
```

### Delete Org

```
DELETE /api/auth/orgs/:id
Authorization: Bearer <token>
```

### List Members

```
GET /api/auth/orgs/:id/members
Authorization: Bearer <token>
```

### Invite Member

```
POST /api/auth/orgs/:id/invite
Authorization: Bearer <token>
Content-Type: application/json

{ "email": "new@example.com", "role": "member" }
```

### Accept Invite

```
GET /api/auth/orgs/accept-invite?token=<invite-token>
Authorization: Bearer <token>
```

### Update Member Role

```
POST /api/auth/orgs/:id/members/:memberId
Authorization: Bearer <token>
Content-Type: application/json

{ "role": "admin" }
```

### Remove Member

```
DELETE /api/auth/orgs/:id/members/:memberId
Authorization: Bearer <token>
```

## OAuth Provider (IdP)

Make your app an OAuth 2.0 + OIDC provider.

### Register Client

```
POST /api/oauth/register
Content-Type: application/json

{
  "name": "My App",
  "redirectUri": "https://myapp.com/callback"
}
```

### List Clients

```
GET /api/oauth/clients
```

### Delete Client

```
DELETE /api/oauth/clients/:id
```

### Authorize

```
GET /api/oauth/authorize?response_type=code&client_id=xxx&redirect_uri=xxx&scope=openid
```

### Token Exchange

```
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=xxx&client_id=xxx&client_secret=xxx&redirect_uri=xxx
```

### Userinfo

```
GET /api/oauth/userinfo
Authorization: Bearer <access-token>
```

### OIDC Discovery

```
GET /api/oauth/.well-known/openid-configuration
```

### JWKS

```
GET /api/oauth/.well-known/jwks.json
```

## Payments

### Create Checkout Session

```
POST /api/payments/checkout
Content-Type: application/json

{
  "priceId": "price_xxx",
  "customerEmail": "john@example.com",
  "successUrl": "https://myapp.com/success",
  "cancelUrl": "https://myapp.com/cancel"
}
```

### Create Customer

```
POST /api/payments/customer
Content-Type: application/json

{
  "email": "john@example.com",
  "name": "John Doe"
}
```

### Create Subscription

```
POST /api/payments/subscription
Content-Type: application/json

{
  "customerId": "cus_xxx",
  "priceId": "price_xxx"
}
```

### Cancel Subscription

```
DELETE /api/payments/subscription/:id
```

### Webhook Handler

```
POST /api/payments/webhook
```

Handles Stripe/Polar webhook events.

## Search

### Search Within Model

```
GET /api/search/posts?q=hello&limit=10&offset=0
```

### Multi-Model Search

```
GET /api/search?q=hello&limit=20
```

**Response:**

```json
{
  "results": [
    { "model": "posts", "id": 1, "score": 0.95, "data": { ... } },
    { "model": "comments", "id": 5, "score": 0.82, "data": { ... } }
  ]
}
```

## Webhooks

### Create Webhook

```
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://myapp.com/webhook",
  "events": "posts.created,posts.updated",
  "secret": "my-secret"
}
```

### List Webhooks

```
GET /api/webhooks
Authorization: Bearer <token>
```

### Update Webhook

```
PUT /api/webhooks/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "url": "https://new-url.com/webhook" }
```

### Delete Webhook

```
DELETE /api/webhooks/:id
Authorization: Bearer <token>
```

## Feature Flags

### List All Flags

```
GET /api/features
```

### Create/Update Flag

```
POST /api/features
Content-Type: application/json

{
  "key": "new-feature",
  "value": true,
  "description": "Enable new feature"
}
```

### Toggle Flag

```
PUT /api/features/:key/toggle
```

### Delete Flag

```
DELETE /api/features/:key
```

## Notifications

### List Notifications

```
GET /api/notifications
Authorization: Bearer <token>
```

### Mark as Read

```
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

### Mark All as Read

```
POST /api/notifications/read-all
Authorization: Bearer <token>
```

## Audit Logs

```
GET /api/audit-logs?model=posts&action=create&limit=20&offset=0
```

**Query Parameters:**

| Param | Description |
|---|---|
| `model` | Filter by model name |
| `action` | Filter by action (create, update, delete) |
| `limit` | Max results (default: 20) |
| `offset` | Offset |

**Response:**

```json
{
  "rows": [
    {
      "id": 1,
      "userId": 1,
      "model": "posts",
      "action": "create",
      "recordId": 5,
      "oldValues": null,
      "newValues": { "title": "Hello", "body": "World" },
      "ip": "127.0.0.1",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 42
}
```

## Jobs

### Submit Job

```
POST /api/jobs/:name/submit
Content-Type: application/json

{
  "args": { "email": "john@example.com" },
  "delay": 3600,
  "maxRetries": 5
}
```

## Captcha

### Verify

```
POST /api/captcha/verify
Content-Type: application/json

{ "token": "turnstile-token" }
```

## Health & Metrics

### Health Check

```
GET /api/health
```

**Response:**

```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 3600
}
```

### Metrics

```
GET /api/admin/metrics
GET /api/metrics    # Prometheus format (if telemetry enabled)
```

## GraphQL

```
POST /api/graphql
Content-Type: application/json

{
  "query": "{ postsList(page: 1, limit: 10) { rows { id title } total } }"
}
```

See [GraphQL](graphql) for full documentation.

## WebSocket

```
ws://localhost:3000/ws
```

**Subscribe:**

```json
{ "subscribe": "posts" }
```

**Receive events:**

```json
{ "topic": "posts:created", "data": { "id": 1, "title": "Hello" } }
```

See [Real-time](realtime) for full documentation.

## Custom Actions

```
ALL /api/actions/{module}/{handler}
```

Action files in `actions/*.ts` are auto-loaded. Each export becomes an endpoint.

```typescript
// actions/greet.ts
export const hello = F.public(async (ctx) => {
  return F.json({ message: "Hello!" })
})
```

```
GET /api/actions/greet/hello
```

## Error Responses

All errors return a consistent format:

```json
{
  "error": "Not Found",
  "message": "Post with id 999 not found",
  "hint": "Check that the ID exists and you have permission to view it"
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Rate Limiting

All endpoints are rate-limited:
- **Default:** 200 requests per 60-second window
- **Keyed by:** `X-Forwarded-For` or `X-Real-IP` header

**Response Headers:**

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 195
X-RateLimit-Reset: 1704067200
```

## Cache Headers

When caching is enabled:

```
X-Cache: HIT
X-Cache: MISS
```

## Authentication

Most endpoints require authentication via:

**Bearer Token:**

```
Authorization: Bearer <jwt-token>
```

**API Key:**

```
Authorization: Bearer Zorux_xxxxxxxxxxxxxxxx...
```

**Cookie:**

```
Cookie: token=<jwt-token>
```
