# Security

Zorux includes enterprise-grade security with ABAC/RBAC policies, security headers, rate limiting, CSRF protection, input sanitization, and audit logging.

## ABAC / RBAC Policy Engine

Attribute-Based Access Control with a recursive descent parser for policy expressions.

### Policy Levels

| Level | Description |
|---|---|
| Operation-level | `list`, `read`, `create`, `update`, `delete` |
| Field-level | Per-field `readable` and `writable` conditions |
| Derived roles | Dynamic role computation from conditions |

### Configuration

```yaml
models:
  Post:
    fields:
      title: string
      body: text
      author: User
    policies:
      list: public
      read: public
      create: authenticated
      update: "resource.authorId == user.id"
      delete: "user.role == 'admin'"
    fieldPolicies:
      - field: title
        readable: public
        writable: "user.role == 'admin' || resource.authorId == user.id"
    derivedRoles:
      - name: author
        condition: "resource.authorId == user.id"
```

### Built-in Keywords

| Keyword | Description |
|---|---|
| `public` | Anyone can access |
| `authenticated` | Must be logged in |
| `owner` | Must own the resource |
| Role string | Must have this role (e.g., `"admin"`) |

### Expression Operators

| Operator | Description | Example |
|---|---|---|
| `==` | Equality | `user.role == "admin"` |
| `!=` | Inequality | `user.status != "banned"` |
| `>`, `>=`, `<`, `<=` | Numeric comparison | `resource.price > 0` |
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

### Policy Evaluation

1. Parse policy expression into AST
2. Resolve variables from user, resource, and environment
3. Evaluate AST recursively
4. Cache result (for expressions under 500 chars)
5. Log decision (last 1000 decisions stored)

### AST Cache

Policies under 500 characters are cached for performance:

```typescript
// First evaluation: parse + evaluate
// Subsequent evaluations: use cached AST
```

### Audit Log

The last 1000 policy decisions are stored in memory for debugging:

```json
{
  "policy": "resource.authorId == user.id",
  "result": true,
  "userId": 1,
  "resourceId": 5,
  "timestamp": "2026-01-01T00:00:00Z"
}
```

## Security Headers

All responses include security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains  (production only)
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.googleapis.com; img-src 'self' data: blob:; connect-src 'self';
```

## Rate Limiter

In-memory token bucket rate limiter.

### Configuration

- **Default:** 200 requests per 60-second window
- **Keyed by:** `X-Forwarded-For` or `X-Real-IP` header

### Response Headers

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 195
X-RateLimit-Reset: 1704067200
```

### Rate Limited Response

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 30 seconds.",
  "hint": "You have made 200 requests in the last 60 seconds."
}
```

**Status:** 429

## CSRF Protection

Token-based CSRF protection.

### How It Works

1. Server generates CSRF token and stores it with 1-hour TTL
2. Token is sent as `csrf_session` cookie
3. Client must include token in `X-CSRF-Token` header
4. Server validates token against stored value

### Exemptions

- `multipart/form-data` requests are skipped (file uploads)
- API key authenticated requests are skipped

### Usage

```javascript
// Get CSRF token from cookie
const token = document.cookie
  .split("; ")
  .find(r => r.startsWith("csrf_session="))
  ?.split("=")[1]

// Include in requests
fetch("/api/posts", {
  method: "POST",
  headers: {
    "X-CSRF-Token": token,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ title: "Hello" })
})
```

## Body Size Limit

All requests are limited to 1MB by default.

```
Content-Length: 1048576  // 1MB max
```

Exceeding this limit returns:

```json
{
  "error": "Payload Too Large",
  "message": "Request body exceeds 1MB limit"
}
```

**Status:** 413

## Input Sanitization

### Filename Sanitization

Filenames are sanitized to prevent:
- Path traversal (`../`)
- Null bytes (`\0`)
- Special characters
- Unicode homoglyphs

### Blocked Extensions

```
.exe, .bat, .cmd, .com, .scr, .pif, .msi, .js, .vbs, .wsf, .php, .py, .rb, .pl, .sh
```

### HTML Escaping

User input in HTML contexts is escaped to prevent XSS.

### JSON Depth Limit

JSON parsing is limited to 20 levels deep to prevent stack overflow attacks.

### Null Byte Removal

Null bytes (`\0`) are stripped from all string inputs.

### Control Character Removal

Control characters (except newlines and tabs) are stripped from inputs.

## Cookie Hardening

Authentication cookies are hardened:

| Attribute | Development | Production |
|---|---|---|
| `HttpOnly` | ✅ | ✅ |
| `Secure` | ❌ | ✅ |
| `SameSite` | `Lax` | `Strict` |

## Audit Log

Every create/update/delete operation is logged:

```sql
CREATE TABLE _audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  model TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Query Audit Logs

```bash
GET /api/audit-logs?model=posts&action=create&limit=20&offset=0
```

### CLI Audit

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

## Password Security

- **Hashing:** bcrypt via `Bun.password.hash()`
- **Min length:** 8 characters (configurable)
- **Storage:** Never stored in plain text
- **Verify cache:** Login verification cached for ~0.36ms performance

## Session Security

- **Refresh tokens:** 30-day expiry
- **JWT tokens:** 24-hour expiry
- **Session tracking:** IP and user agent recorded
- **Revocation:** Individual or all sessions can be revoked

## Best Practices

1. **Change JWT secret** — Never use the default in production
2. **Enable HTTPS** — Use `Strict-Transport-Security` in production
3. **Use ABAC policies** — Restrict access to models and fields
4. **Enable rate limiting** — Prevent abuse
5. **Monitor audit logs** — Track suspicious activity
6. **Keep dependencies updated** — Regular security patches
7. **Use environment variables** — Never hardcode secrets
8. **Validate input** — Use YAML field validators
