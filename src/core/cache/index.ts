export interface CacheAdapter {
  name: string
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  flush(): Promise<void>
}

// ═══════════════════════════════════════════════════
// Memory Cache
// ═══════════════════════════════════════════════════

interface CacheEntry {
  value: string
  expiresAt: number
}

class MemoryCache implements CacheAdapter {
  name = "memory"
  private store = new Map<string, CacheEntry>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.cleanupTimer = setInterval(() => this.evictExpired(), 60_000)
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return null }
    return entry.value
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  async del(key: string): Promise<void> { this.store.delete(key) }
  async flush(): Promise<void> { this.store.clear() }

  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }

  destroy(): void { if (this.cleanupTimer) clearInterval(this.cleanupTimer); this.store.clear() }
}

// ═══════════════════════════════════════════════════
// Redis (Valkey, KeyDB, Dragonfly — protocolo compatível)
// ═══════════════════════════════════════════════════

class RedisCache implements CacheAdapter {
  name = "redis"
  private client: any

  constructor(url: string) {
    const { Redis } = require("ioredis")
    this.client = new Redis(url)
  }

  async get(key: string): Promise<string | null> {
    const val = await this.client.get(key); return val ?? null
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    await this.client.setex(key, ttlSeconds, value)
  }

  async del(key: string): Promise<void> { await this.client.del(key) }
  async flush(): Promise<void> { await this.client.flushall() }
}

// ═══════════════════════════════════════════════════
// Upstash Redis (REST API, serverless)
// ═══════════════════════════════════════════════════

class UpstashCache implements CacheAdapter {
  name = "upstash"
  private token: string
  private url: string

  constructor(url: string, token: string) {
    this.url = url
    this.token = token
  }

  private async request(command: string, ...args: any[]): Promise<any> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: "Bearer " + this.token, "Content-Type": "application/json" },
      body: JSON.stringify([command, ...args]),
    })
    const data = await res.json()
    return data
  }

  async get(key: string): Promise<string | null> {
    const val = await this.request("GET", key)
    return val === null || val === undefined ? null : String(val)
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    await this.request("SETEX", key, ttlSeconds, value)
  }

  async del(key: string): Promise<void> { await this.request("DEL", key) }
  async flush(): Promise<void> { await this.request("FLUSHALL") }
}

// ═══════════════════════════════════════════════════
// Cloudflare KV (REST API)
// ═══════════════════════════════════════════════════

class CloudflareKVCache implements CacheAdapter {
  name = "cf-kv"
  private accountId: string
  private namespaceId: string
  private apiToken: string
  private baseUrl: string

  constructor(accountId: string, namespaceId: string, apiToken: string) {
    this.accountId = accountId
    this.namespaceId = namespaceId
    this.apiToken = apiToken
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values`
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const res = await fetch(this.baseUrl + path, {
      method,
      headers: { Authorization: "Bearer " + this.apiToken, "Content-Type": "application/json" },
      body: body ? body : undefined,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error("[cf-kv] " + res.status + ": " + text)
    }
    // GET returns the value directly (not JSON), other methods return JSON
    if (method === "GET") return res.text()
    return res.json()
  }

  async get(key: string): Promise<string | null> {
    try {
      const val = await this.request("GET", "/" + encodeURIComponent(key))
      return val || null
    } catch {
      return null
    }
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    const path = "/" + encodeURIComponent(key) + "?expiration_ttl=" + Math.min(ttlSeconds, 4_320_000)
    await this.request("PUT", path, value)
  }

  async del(key: string): Promise<void> {
    try { await this.request("DELETE", "/" + encodeURIComponent(key)) } catch {}
  }

  async flush(): Promise<void> {
    // KV não tem flush nativo — listar e deletar cada chave seria caro
    console.warn("[cache] Cloudflare KV flush not supported. Use TTL-based expiry.")
  }
}

// ═══════════════════════════════════════════════════
// Memcached
// ═══════════════════════════════════════════════════

class MemcachedCache implements CacheAdapter {
  name = "memcached"
  private client: any

  constructor(host = "localhost", port = 11211) {
    const { Client } = require("memcached")
    this.client = new Client(host + ":" + port)
  }

  async get(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      this.client.get(key, (err: any, data: any) => resolve(data ?? null))
    })
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, ttlSeconds, (err: any) => err ? reject(err) : resolve())
    })
  }

  async del(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err: any) => err ? reject(err) : resolve())
    })
  }

  async flush(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.flush((err: any) => err ? reject(err) : resolve())
    })
  }
}

// ═══════════════════════════════════════════════════
// DynamoDB
// ═══════════════════════════════════════════════════

class DynamoDBCache implements CacheAdapter {
  name = "dynamodb"
  private doc: any
  private tableName: string

  constructor(tableName: string, region?: string) {
    const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb")
    const { DynamoDBClient } = require("@aws-sdk/client-dynamodb")
    this.tableName = tableName || process.env.DYNAMODB_CACHE_TABLE || "Zorux_cache"
    const client = new DynamoDBClient({ region: region || process.env.AWS_REGION || "us-east-1" })
    this.doc = DynamoDBDocumentClient.from(client)
    this.commands = { PutCommand, GetCommand, DeleteCommand }
  }

  private commands: any

  async get(key: string): Promise<string | null> {
    const cmd = new this.commands.GetCommand({ TableName: this.tableName, Key: { pk: key } })
    const result = await this.doc.send(cmd)
    if (!result.Item) return null
    const expires = result.Item.expires
    if (expires && Date.now() > expires) {
      await this.del(key)
      return null
    }
    return result.Item.value ?? null
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    const cmd = new this.commands.PutCommand({
      TableName: this.tableName,
      Item: { pk: key, value, expires: Date.now() + ttlSeconds * 1000 },
    })
    await this.doc.send(cmd)
  }

  async del(key: string): Promise<void> {
    const cmd = new this.commands.DeleteCommand({ TableName: this.tableName, Key: { pk: key } })
    await this.doc.send(cmd)
  }

  async flush(): Promise<void> {
    // DynamoDB não tem flush nativo — ignorado
    console.warn("[cache] DynamoDB flush not supported. Use TTL-based expiry.")
  }
}

// ═══════════════════════════════════════════════════
// SQLite Cache
// ═══════════════════════════════════════════════════

class SQLiteCache implements CacheAdapter {
  name = "sqlite"
  private db: any

  constructor(path?: string) {
    const { Database } = require("bun:sqlite")
    this.db = new Database(path || ":memory:")
    this.db.run("CREATE TABLE IF NOT EXISTS _cache (key TEXT PRIMARY KEY, value TEXT, expires_at INTEGER)")
    this.db.run("CREATE INDEX IF NOT EXISTS idx_cache_expires ON _cache(expires_at)")
  }

  async get(key: string): Promise<string | null> {
    const row = this.db.prepare("SELECT value, expires_at FROM _cache WHERE key = ?").get(key) as any
    if (!row) return null
    if (row.expires_at && Date.now() > row.expires_at) {
      this.db.prepare("DELETE FROM _cache WHERE key = ?").run(key)
      return null
    }
    return row.value
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    const expires = Date.now() + ttlSeconds * 1000
    this.db.prepare("INSERT OR REPLACE INTO _cache (key, value, expires_at) VALUES (?, ?, ?)").run(key, value, expires)
  }

  async del(key: string): Promise<void> {
    this.db.prepare("DELETE FROM _cache WHERE key = ?").run(key)
  }

  async flush(): Promise<void> {
    this.db.prepare("DELETE FROM _cache").run()
  }
}

// ═══════════════════════════════════════════════════
// Cache Middleware
// ═══════════════════════════════════════════════════

export function cacheMiddleware(cache: CacheAdapter, ttlSeconds = 60) {
  return async (c: any, next: any) => {
    if (c.req.method !== "GET") return next()

    const url = c.req.url
    const cached = await cache.get(url)

    if (cached) {
      c.header("X-Cache", "HIT")
      return c.json(JSON.parse(cached))
    }

    const originalJson = c.json.bind(c)
    c.json = (body: any, status?: number) => {
      if (status === undefined || status === 200) {
        cache.set(url, JSON.stringify(body), ttlSeconds).catch(() => {})
      }
      c.header("X-Cache", "MISS")
      return originalJson(body, status)
    }

    return next()
  }
}

export function invalidateModelCache(cache: CacheAdapter, _modelTable: string): Promise<void> {
  return cache.flush()
}

// ═══════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════

let currentCache: CacheAdapter = new MemoryCache()

export function createCache(config?: { provider?: string; url?: string; ttl?: number }): CacheAdapter {
  const provider = config?.provider || "memory"

  switch (provider) {
    case "redis": {
      const url = config?.url || process.env.REDIS_URL || "redis://localhost:6379"
      currentCache = new RedisCache(url)
      break
    }
    case "upstash": {
      const url = config?.url || process.env.UPSTASH_REDIS_REST_URL || ""
      const token = process.env.UPSTASH_REDIS_REST_TOKEN || ""
      if (!url || !token) throw new Error("Upstash requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars")
      currentCache = new UpstashCache(url, token)
      break
    }
    case "cf-kv":
    case "cloudflare-kv": {
      const accountId = process.env.CF_ACCOUNT_ID || ""
      const namespaceId = process.env.CF_KV_NAMESPACE_ID || ""
      const apiToken = process.env.CF_API_TOKEN || ""
      if (!accountId || !namespaceId || !apiToken) {
        throw new Error("Cloudflare KV requires CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN env vars")
      }
      currentCache = new CloudflareKVCache(accountId, namespaceId, apiToken)
      break
    }
    case "cf-do":
    case "durable-objects": {
      const { createDurableObjectsCache } = require("../cloudflare")
      currentCache = createDurableObjectsCache()
      break
    }
    case "memcached": {
      const host = process.env.MEMCACHED_HOST || "localhost"
      const port = parseInt(process.env.MEMCACHED_PORT || "11211")
      currentCache = new MemcachedCache(host, port)
      break
    }
    case "dynamodb": {
      const table = process.env.DYNAMODB_CACHE_TABLE || "Zorux_cache"
      const region = process.env.AWS_REGION || "us-east-1"
      currentCache = new DynamoDBCache(table, region)
      break
    }
    case "sqlite": {
      const dbPath = config?.url || process.env.SQLITE_CACHE_PATH || ":memory:"
      currentCache = new SQLiteCache(dbPath)
      break
    }
    default:
      currentCache = new MemoryCache()
  }

  return currentCache
}

export function getCache(): CacheAdapter {
  return currentCache
}
