// ── Security Headers ──

export function securityHeaders(c: any, next: any) {
  c.header("X-Content-Type-Options", "nosniff")
  c.header("X-Frame-Options", "DENY")
  c.header("X-XSS-Protection", "1; mode=block")
  c.header("Referrer-Policy", "strict-origin-when-cross-origin")

  const isDev = process.env.NODE_ENV !== "production"
  if (!isDev) {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  }

  // CSP — restrictive but allows inline styles and CDN scripts for Swagger UI
  c.header("Content-Security-Policy", [
    "default-src 'self' https:",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
    "frame-ancestors 'none'",
  ].join("; "))

  return next()
}

// ── Rate Limiter (in-memory token bucket) ──

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitOptions {
  windowMs: number
  maxRequests: number
}

const defaultRateLimit: RateLimitOptions = {
  windowMs: 60_000,
  maxRequests: 100,
}

export function rateLimiter(options?: Partial<RateLimitOptions>) {
  const opts = { ...defaultRateLimit, ...options }

  return (c: any, next: any) => {
    const key = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
                c.req.header("x-real-ip") ||
                "127.0.0.1"
    const now = Date.now()
    const entry = rateLimitStore.get(key)

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + opts.windowMs })
      return next()
    }

    entry.count++

    c.header("X-RateLimit-Limit", String(opts.maxRequests))
    c.header("X-RateLimit-Remaining", String(Math.max(0, opts.maxRequests - entry.count)))
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)))

    if (entry.count > opts.maxRequests) {
      return c.json({ error: "Too many requests. Try again later." }, 429)
    }

    return next()
  }
}

// ── Body Size Limit ──

export function bodySizeLimit(maxBytes = 1_048_576) {
  return (c: any, next: any) => {
    const contentLength = parseInt(c.req.header("content-length") || "0", 10)
    if (contentLength > maxBytes) {
      return c.json({ error: "Request entity too large" }, 413)
    }
    return next()
  }
}

// ── Cookie hardening ──

export function setSecureCookie(c: any, name: string, value: string, maxAge?: number) {
  const isDev = process.env.NODE_ENV !== "production"
  const parts = [
    name + "=" + value,
    "Path=/",
    "HttpOnly",
  ]
  if (!isDev) parts.push("Secure", "SameSite=Strict")
  else parts.push("SameSite=Lax")
  if (maxAge !== undefined) parts.push("Max-Age=" + maxAge)
  c.header("Set-Cookie", parts.join("; "))
}

// Clear rate limiter store (for testing)
export function clearRateLimiter() {
  rateLimitStore.clear()
}
