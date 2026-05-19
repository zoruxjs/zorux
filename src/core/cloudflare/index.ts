import type { DataCollection, DatabaseAdapter } from "../db"
import type { CompiledModel } from "../types"

// ═══════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════

function cfApiToken(): string {
  return process.env.CF_API_TOKEN || ""
}

function cfAccountId(): string {
  return process.env.CF_ACCOUNT_ID || ""
}

function cfHeaders(): Record<string, string> {
  return {
    Authorization: "Bearer " + cfApiToken(),
    "Content-Type": "application/json",
  }
}

async function cfFetch(path: string, method = "GET", body?: any): Promise<any> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId()}${path}`
  const res = await fetch(url, {
    method,
    headers: cfHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error("[cloudflare] " + (data.errors?.[0]?.message || "API error"))
  }
  return data.result
}

// ═══════════════════════════════════════════════════
// 1. D1 Database Adapter
// ═══════════════════════════════════════════════════

class D1Collection implements DataCollection {
  constructor(private databaseId: string, public tableName: string, private model?: CompiledModel) {}

  private async query(sql: string, params?: any[]): Promise<any> {
    const result = await cfFetch(`/d1/database/${this.databaseId}/query`, "POST", { sql, params: params || [] })
    return result?.[0] || { results: [], success: true }
  }

  async find(sort = "id", order = "ASC", limit = 0, offset = 0): Promise<any[]> {
    const safeSort = this.model?.fields.find(f => f.name === sort) ? sort : "id"
    let sql = `SELECT * FROM ${this.tableName} ORDER BY ${safeSort} ${order}`
    if (limit > 0) sql += ` LIMIT ${limit} OFFSET ${offset}`
    const result = await this.query(sql)
    return result.results || []
  }

  async findById(id: any): Promise<any> {
    const result = await this.query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id])
    return result.results?.[0] || null
  }

  async findBy(field: string, value: any): Promise<any> {
    const result = await this.query(`SELECT * FROM ${this.tableName} WHERE ${field} = ?`, [value])
    return result.results?.[0] || null
  }

  async insert(data: Record<string, any>): Promise<any> {
    const keys = Object.keys(data)
    const vals = Object.values(data)
    const placeholders = keys.map(() => "?").join(", ")
    await this.query(`INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES (${placeholders})`, vals)
    const last = await this.query(`SELECT MAX(id) as id FROM ${this.tableName}`)
    const id = last.results?.[0]?.id
    return id ? this.findById(id) : null
  }

  async update(id: any, data: Record<string, any>): Promise<void> {
    const keys = Object.keys(data)
    const vals = Object.values(data)
    const set = keys.map(k => `${k} = ?`).join(", ")
    await this.query(`UPDATE ${this.tableName} SET ${set} WHERE id = ?`, [...vals, id])
  }

  async deleteById(id: any): Promise<void> {
    await this.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id])
  }

  async count(): Promise<number> {
    const result = await this.query(`SELECT COUNT(*) as cnt FROM ${this.tableName}`)
    return result.results?.[0]?.cnt || 0
  }

  async search(fields: string[], term: string, sort = "id", order = "ASC", limit = 20, offset = 0): Promise<{ rows: any[]; total: number }> {
    if (!term || fields.length === 0) {
      const total = await this.count()
      const rows = await this.find(sort, order, limit, offset)
      return { rows, total }
    }
    const conds = fields.map(f => `${f} LIKE ?`).join(" OR ")
    const params = fields.map(() => `%${term}%`)
    const countResult = await this.query(`SELECT COUNT(*) as cnt FROM ${this.tableName} WHERE ${conds}`, params)
    const total = countResult.results?.[0]?.cnt || 0
    const rowsResult = await this.query(`SELECT * FROM ${this.tableName} WHERE ${conds} ORDER BY ${sort} ${order} LIMIT ${limit} OFFSET ${offset}`, params)
    return { rows: rowsResult.results || [], total }
  }
}

function getD1DbUrl(): string {
  return process.env.CF_D1_DATABASE_ID || ""
}

// ═══════════════════════════════════════════════════
// 2. Durable Objects (via REST API)
// ═══════════════════════════════════════════════════

class DurableObjectsCache {
  name = "cf-do"
  private namespaceId: string
  private baseUrl: string

  constructor() {
    this.namespaceId = process.env.CF_DO_NAMESPACE_ID || ""
    if (!this.namespaceId) throw new Error("Durable Objects requires CF_DO_NAMESPACE_ID env var")
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId()}/durable_objects/namespaces/${this.namespaceId}/objects`
  }

  private objectUrl(id: string): string {
    return `${this.baseUrl}/${id}`
  }

  async get(key: string): Promise<string | null> {
    try {
      const res = await fetch(this.objectUrl(encodeURIComponent(key)), { headers: cfHeaders() })
      if (!res.ok) return null
      return res.text()
    } catch { return null }
  }

  async set(key: string, value: string, _ttlSeconds?: number): Promise<void> {
    await fetch(this.objectUrl(encodeURIComponent(key)), {
      method: "PUT",
      headers: cfHeaders(),
      body: value,
    })
  }

  async del(key: string): Promise<void> {
    await fetch(this.objectUrl(encodeURIComponent(key)), { method: "DELETE", headers: cfHeaders() })
  }

  async flush(): Promise<void> {
    console.warn("[cache] Durable Objects flush not supported via REST API")
  }
}

// ═══════════════════════════════════════════════════
// 3. Queues (via REST API)
// ═══════════════════════════════════════════════════

export async function queuesSend(queueId: string, body: any): Promise<void> {
  await cfFetch(`/queues/queues/${queueId}/messages`, "POST", { messages: [{ body: JSON.stringify(body) }] })
}

export async function queuesSendBatch(queueId: string, messages: any[]): Promise<void> {
  await cfFetch(`/queues/queues/${queueId}/messages`, "POST", {
    messages: messages.map(m => ({ body: JSON.stringify(m) })),
  })
}

// ═══════════════════════════════════════════════════
// 4. Workers AI
// ═══════════════════════════════════════════════════

export interface AIOptions {
  model?: string
  messages?: { role: string; content: string }[]
  prompt?: string
  maxTokens?: number
}

export async function aiRun(options: AIOptions): Promise<any> {
  const model = options.model || "@cf/meta/llama-3.1-8b-instruct"
  const body: any = { max_tokens: options.maxTokens || 256 }

  if (options.messages) {
    body.messages = options.messages
  } else if (options.prompt) {
    body.prompt = options.prompt
  }

  return cfFetch(`/ai/run/${model}`, "POST", body)
}

export async function aiChat(messages: { role: string; content: string }[], model?: string): Promise<string> {
  const result = await aiRun({ messages, model })
  return result?.response || ""
}

export async function aiEmbed(text: string, model = "@cf/baai/bge-small-en-v1.5"): Promise<number[]> {
  const result = await cfFetch(`/ai/run/${model}`, "POST", { text })
  return result?.data || []
}

// ═══════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════

export { D1Collection, DurableObjectsCache }
export function createD1Database(databaseId?: string): DatabaseAdapter {
  const id = databaseId || getD1DbUrl()
  return {
    collection(targetTable: string, model?: CompiledModel): DataCollection {
      return new D1Collection(id, targetTable, model)
    },
    run(_sql: string, _params?: any[]): void {},
    async connect(): Promise<void> {},
    close(): void {},
  }
}

export function createDurableObjectsCache(): DurableObjectsCache {
  return new DurableObjectsCache()
}
