import type { CompiledModel } from "../types"

// ═══════════════════════════════════════════════════
// Search Provider Interface
// ═══════════════════════════════════════════════════

export interface SearchProvider {
  name: string
  index(modelTable: string, document: Record<string, any>): Promise<void>
  remove(modelTable: string, id: any): Promise<void>
  search(modelTable: string, query: string, options?: { limit?: number; offset?: number }): Promise<{ hits: any[]; total: number }>
  flushIndex(modelTable: string): Promise<void>
}

// ═══════════════════════════════════════════════════
// Meilisearch Provider (via REST API)
// ═══════════════════════════════════════════════════

class MeilisearchProvider implements SearchProvider {
  name = "meilisearch"
  private host: string
  private apiKey: string

  constructor(host: string, apiKey: string) {
    this.host = host.replace(/\/$/, "")
    this.apiKey = apiKey
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const res = await fetch(this.host + path, {
      method,
      headers: {
        Authorization: "Bearer " + this.apiKey,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error("[meilisearch] " + res.status + ": " + text)
    }
    return res.json()
  }

  private async ensureIndex(modelTable: string): Promise<void> {
    try {
      await this.request("GET", "/indexes/" + modelTable)
    } catch {
      await this.request("POST", "/indexes", { uid: modelTable, primaryKey: "id" })
    }
  }

  async index(modelTable: string, document: Record<string, any>): Promise<void> {
    await this.ensureIndex(modelTable)
    await this.request("POST", "/indexes/" + modelTable + "/documents", [document])
  }

  async remove(modelTable: string, id: any): Promise<void> {
    await this.request("DELETE", "/indexes/" + modelTable + "/documents/" + id)
  }

  async search(modelTable: string, query: string, options?: { limit?: number; offset?: number }): Promise<{ hits: any[]; total: number }> {
    try {
      const result = await this.request("POST", "/indexes/" + modelTable + "/search", {
        q: query,
        limit: options?.limit || 20,
        offset: options?.offset || 0,
      })
      return { hits: result.hits || [], total: result.estimatedTotalHits || result.nbHits || 0 }
    } catch {
      // Index might not exist yet
      return { hits: [], total: 0 }
    }
  }

  async flushIndex(modelTable: string): Promise<void> {
    await this.request("DELETE", "/indexes/" + modelTable + "/documents")
  }
}

// ═══════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════

let currentProvider: SearchProvider | null = null

export function createSearchProvider(config?: { provider?: string; host?: string; apiKey?: string }): SearchProvider {
  const provider = config?.provider || process.env.SEARCH_PROVIDER || ""

  switch (provider) {
    case "meilisearch":
    case "meili": {
      const host = config?.host || process.env.MEILISEARCH_HOST || "http://localhost:7700"
      const apiKey = config?.apiKey || process.env.MEILISEARCH_API_KEY || ""
      currentProvider = new MeilisearchProvider(host, apiKey)
      return currentProvider
    }
    default:
      throw new Error("Search provider not configured. Set SEARCH_PROVIDER=meilisearch")
  }
}

export function getSearchProvider(): SearchProvider | null {
  return currentProvider
}

// ═══════════════════════════════════════════════════
// Auto-index from Router
// ═══════════════════════════════════════════════════

export async function indexModelRecord(provider: SearchProvider, model: CompiledModel, data: any): Promise<void> {
  if (!data?.id) return

  // Build a searchable document with all text fields
  const document: Record<string, any> = { id: data.id }
  for (const field of model.fields) {
    if (!field.isRelation && field.name !== "password") {
      const val = data[field.name]
      if (val !== null && val !== undefined) {
        document[field.name] = val
      }
    }
  }

  try {
    await provider.index(model.tableName, document)
  } catch {}
}

export async function removeModelIndex(provider: SearchProvider, model: CompiledModel, id: any): Promise<void> {
  try {
    await provider.remove(model.tableName, id)
  } catch {}
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerSearchRoutes(app: any, models: CompiledModel[]) {
  const provider = getSearchProvider()
  if (!provider) return

  // GET /api/search/:model?q= — search within a model
  app.get("/api/search/:model", async (c: any) => {
    try {
      const modelName = c.req.param("model")
      const query = c.req.query("q") || c.req.query("search") || ""
      const limit = parseInt(c.req.query("limit") || "20")
      const offset = parseInt(c.req.query("offset") || "0")

      if (!query) return c.json({ hits: [], total: 0 })

      // Find the matching model
      const model = models.find((m: any) => m.tableName === modelName || m.name === modelName)
      if (!model) return c.json({ error: "Unknown model: " + modelName }, 404)

      const result = await provider.search(model.tableName, query, { limit, offset })
      return c.json(result)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // GET /api/search — multi-model search
  app.get("/api/search", async (c: any) => {
    try {
      const query = c.req.query("q") || c.req.query("search") || ""
      const limit = parseInt(c.req.query("limit") || "5")

      if (!query) return c.json({ results: [] })

      const results: any[] = []
      for (const model of models) {
        const result = await provider.search(model.tableName, query, { limit })
        if (result.hits.length > 0) {
          results.push({ model: model.name, table: model.tableName, ...result })
        }
      }
      return c.json({ results })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })
}
