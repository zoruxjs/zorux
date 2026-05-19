# Security

Zorux includes built-in security protections:

## Middleware (auto-applied)

| Protection | Description |
|-----------|-------------|
| Security Headers | CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy |
| Rate Limiting | 200 req/min per IP, returns 429 |
| Body Size Limit | Max 1MB per request, returns 413 |
| Cookie Hardening | HttpOnly, SameSite=Strict (production), Secure (production) |

## CSRF Protection

```ts
import { generateCsrfToken, validateCsrfToken } from "Zorux/security"
```

## Input Sanitization

```ts
import { sanitizeFilename, escapeHtml, sanitizeInput, parseJsonSafe } from "Zorux/security"
```

## Security Audit

```bash
fw audit
```

Checks for: weak JWT secret, secrets in .gitignore, hardcoded credentials, dependency vulnerabilities.

## Security Tests

```bash
fw test --security     # Generate security tests
bun test tests/security # Run SQLi, XSS, JWT, RBAC, brute force, DoS tests
```
