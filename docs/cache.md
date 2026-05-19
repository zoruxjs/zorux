# Cache

Zorux supports 10 cache providers with auto-caching middleware, automatic invalidation, and cache headers.

## Configuration

```yaml
cache:
  provider: memory              # Required
  url: string                   # For remote providers
  ttl: 60                       # Default TTL in seconds
```

## Providers

### Memory (Default)

In-memory LRU cache. No setup required.

```yaml
cache:
  provider: memory
  ttl: 60
```

**Best for:** Development, single-instance apps.

### Redis

```yaml
cache:
  provider: redis
  url: "redis://localhost:6379"
  ttl: 120
```

**Compatible with:** Redis, Valkey, KeyDB, Dragonfly

**Environment Variable:** `REDIS_URL`

### Upstash

Serverless Redis for edge deployments.

```yaml
cache:
  provider: upstash
  url: "https://xxx.upstash.io"
```

**Environment Variables:**
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Memcached

```yaml
cache:
  provider: memcached
```

**Environment Variables:**
- `MEMCACHED_HOST` (default: `localhost`)
- `MEMCACHED_PORT` (default: `11211`)

### DynamoDB

```yaml
cache:
  provider: dynamodb
```

**Environment Variables:**
- `DYNAMODB_CACHE_TABLE` — Table name
- `AWS_REGION` — AWS region

### SQLite

File-based cache using SQLite.

```yaml
cache:
  provider: sqlite
```

**Environment Variable:** `SQLITE_CACHE_PATH`

### Cloudflare KV

```yaml
cache:
  provider: cf-kv
```

**Environment Variables:**
- `CF_ACCOUNT_ID`
- `CF_KV_NAMESPACE_ID`
- `CF_API_TOKEN`

### Cloudflare Durable Objects

```yaml
cache:
  provider: cf-do
```

**Environment Variable:** `CF_DO_NAMESPACE_ID`

## Adapter Interface

```typescript
interface CacheAdapter {
  name: string
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  flush(): Promise<void>
}
```

## Auto-Caching Middleware

When caching is enabled, GET requests are automatically cached:

1. **First request:** Response is cached with the URL as key
2. **Subsequent requests:** Cached response is returned
3. **Write operations (POST/PUT/DELETE):** Cache is invalidated

### Cache Headers

```
X-Cache: HIT     # Response served from cache
X-Cache: MISS    # Response fetched from origin
```

### Cache Key

The cache key is the full URL including query parameters:

```
/api/posts?page=1&limit=20&sort=title
```

### TTL

Default TTL is set in `cache.ttl`. Individual responses can override this.

## Cache Invalidation

Cache is automatically invalidated on:

- `POST /api/{model}` — Create
- `PUT /api/{model}/:id` — Update
- `DELETE /api/{model}/:id` — Delete
- Bulk operations
- Import operations

Invalidation flushes all keys containing the model's table name.

## Manual Cache Operations

In custom actions or plugins:

```typescript
// Get from cache
const cached = await cache.get("my-key")

// Set with default TTL
await cache.set("my-key", JSON.stringify(data))

// Set with custom TTL (300 seconds)
await cache.set("my-key", JSON.stringify(data), 300)

// Delete
await cache.del("my-key")

// Flush all
await cache.flush()
```

## Performance

| Provider | Latency | Best Use Case |
|---|---|---|
| Memory | <1ms | Development, single instance |
| Redis | 1-5ms | Production, multi-instance |
| Upstash | 10-50ms | Serverless, edge |
| Memcached | 1-5ms | High-throughput caching |
| DynamoDB | 10-20ms | AWS-native apps |
| Cloudflare KV | 5-15ms | Edge caching |

## When to Use Caching

**Enable caching when:**
- Read-heavy workloads
- Expensive queries
- Multi-instance deployments
- API response times need improvement

**Skip caching when:**
- Write-heavy workloads
- Real-time data requirements
- Single-user applications
