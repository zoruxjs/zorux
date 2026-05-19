import type { AppConfig, CompiledModel } from "../types"
import type { PlatformAdapter, AuthInput, AuthResult, AuthProvider, RealtimeProvider, StorageProvider } from "./types"
import type { DataCollection } from "../db"

interface SupabaseConfig {
  url: string
  anonKey: string
  serviceKey: string
}

function getSupabaseConfig(config: AppConfig): SupabaseConfig {
  const sb = (config as any).supabase || {}
  const url = process.env.SUPABASE_URL || sb.url || ""
  const anonKey = process.env.SUPABASE_ANON_KEY || sb.anonKey || ""
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || sb.serviceKey || ""
  if (!url || !serviceKey) throw new Error("Supabase requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars or supabase.url/serviceKey in YAML")
  return { url, anonKey, serviceKey }
}

function makeSupabaseClient(sbConfig: SupabaseConfig, useServiceKey = false) {
  const { createClient } = require("@supabase/supabase-js")
  return createClient(sbConfig.url, useServiceKey ? sbConfig.serviceKey : sbConfig.anonKey)
}

// ---- Database Collection ----

function makeDatabase(models: CompiledModel[], sbConfig: SupabaseConfig) {
  const clients = new Map<string, any>()

  function getClient(serviceKey = false) {
    const key = serviceKey ? "service" : "anon"
    if (!clients.has(key)) clients.set(key, makeSupabaseClient(sbConfig, serviceKey))
    return clients.get(key)
  }

  function col(tableName: string, model?: CompiledModel): DataCollection {
    return new SupabaseCollection(getClient(true), tableName, model)
  }

  return {
    collection: col,
    close() {
      for (const c of clients.values()) c.auth.signOut()
    },
  }
}

class SupabaseCollection implements DataCollection {
  constructor(private supabase: any, public tableName: string, private model?: CompiledModel) {}

  async find(sort = "id", order = "ASC", limit = 0, offset = 0): Promise<any[]> {
    let q: any = this.supabase.from(this.tableName).select("*")
    if (sort !== "id" && this.model?.fields.find(f => f.name === sort)) {
      q = q.order(sort, { ascending: order !== "DESC" })
    } else {
      q = q.order("id", { ascending: true })
    }
    if (limit > 0) q = q.range(offset, offset + limit - 1)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data || []
  }

  async findById(id: any): Promise<any> {
    const { data, error } = await this.supabase.from(this.tableName).select("*").eq("id", id).single()
    if (error && error.code !== "PGRST116") throw new Error(error.message)
    return data || null
  }

  async findBy(field: string, value: any): Promise<any> {
    const { data, error } = await this.supabase.from(this.tableName).select("*").eq(field, value).single()
    if (error && error.code !== "PGRST116") throw new Error(error.message)
    return data || null
  }

  async insert(data: Record<string, any>): Promise<any> {
    const { data: result, error } = await this.supabase.from(this.tableName).insert(data).select().single()
    if (error) throw new Error(error.message)
    return result
  }

  async update(id: any, data: Record<string, any>): Promise<void> {
    const { error } = await this.supabase.from(this.tableName).update(data).eq("id", id)
    if (error) throw new Error(error.message)
  }

  async deleteById(id: any): Promise<void> {
    const { error } = await this.supabase.from(this.tableName).delete().eq("id", id)
    if (error) throw new Error(error.message)
  }

  async count(): Promise<number> {
    const { count, error } = await this.supabase.from(this.tableName).select("*", { count: "exact", head: true })
    if (error) throw new Error(error.message)
    return count || 0
  }

  async search(fields: string[], term: string, sort = "id", order = "ASC", limit = 20, offset = 0): Promise<{ rows: any[]; total: number }> {
    if (!term || fields.length === 0) {
      const total = await this.count()
      const rows = await this.find(sort, order, limit, offset)
      return { rows, total }
    }
    const orConds = fields.map(f => f + ".ilike.%25" + encodeURIComponent(term).replace(/%20/g, "+") + "%25").join(",")
    let q: any = this.supabase.from(this.tableName).select("*", { count: "exact" }).or(orConds)
    if (sort !== "id" && this.model?.fields.find(f => f.name === sort)) {
      q = q.order(sort, { ascending: order !== "DESC" })
    }
    q = q.range(offset, offset + limit - 1)
    const { data, count, error } = await q
    if (error) throw new Error(error.message)
    return { rows: data || [], total: count || 0 }
  }
}

// ---- Auth Provider ----

function makeAuthProvider(models: CompiledModel[], sbConfig: SupabaseConfig): AuthProvider {
  const serviceClient = makeSupabaseClient(sbConfig, true)
  const authModel = models.find(m => m.hasAuth)

  return {
    async register(input: AuthInput): Promise<AuthResult> {
      const { data, error } = await serviceClient.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { name: input.name },
      })
      if (error) throw new Error(error.message)
      const sbUser = data.user

      // Create profile in the application's user table
      if (authModel) {
        const col = new SupabaseCollection(makeSupabaseClient(sbConfig, true), authModel.tableName, authModel)
        await col.insert({
          id: sbUser.id,
          name: input.name || input.email.split("@")[0],
          email: input.email,
        })
      }

      const token = sbUser.email_confirmed_at ? (await serviceClient.auth.admin.createUser({ email: input.email, password: input.password })).data.user?.email || "" : ""
      return {
        token: token || "",
        user: { id: sbUser.id, name: input.name || "", email: input.email },
      }
    },

    async login(input: AuthInput): Promise<AuthResult> {
      const anonClient = makeSupabaseClient(sbConfig)
      const { data, error } = await anonClient.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })
      if (error) throw new Error(error.message)
      const meta = data.user?.user_metadata || {}
      return {
        token: data.session?.access_token || "",
        user: { id: data.user!.id, name: meta.name || data.user!.email || "", email: data.user!.email || "" },
      }
    },

    async me(userId: any) {
      // Look up in application user table
      if (!authModel) return null
      const col = new SupabaseCollection(makeSupabaseClient(sbConfig, true), authModel.tableName, authModel)
      return col.findById(userId)
    },

    middleware() {
      return async (c: any, next: any) => {
        const auth = c.req.header("Authorization")
        let token: string | null = null
        if (auth?.startsWith("Bearer ")) token = auth.slice(7)
        else {
          const cookie = c.req.header("Cookie") || ""
          const match = cookie.match(/token=([^;]+)/)
          token = match ? match[1] : null
        }
        if (!token) return c.json({ error: "Unauthorized" }, 401)

        const anonClient = makeSupabaseClient(sbConfig)
        const { data, error } = await anonClient.auth.getUser(token)
        if (error || !data.user) return c.json({ error: "Invalid token" }, 401)
        c.set("user", { id: data.user.id, email: data.user.email })
        await next()
      }
    },
  }
}

// ---- Realtime Provider ----

function makeRealtimeProvider(sbConfig: SupabaseConfig): RealtimeProvider {
  const client = makeSupabaseClient(sbConfig)
  const channels = new Map<string, any>()
  const listeners = new Map<string, Set<(data: any) => void>>()

  return {
    publish(_topic: string, _data: any) {
      // Supabase Realtime is CDC-based; writes to DB auto-publish
    },

    subscribe(topic: string, callback: (data: any) => void) {
      if (!listeners.has(topic)) listeners.set(topic, new Set())
      listeners.get(topic)!.add(callback)

      if (!channels.has(topic)) {
        const channel = client.channel(topic)
        channel.on("postgres_changes",
          { event: "*", schema: "public", table: topic },
          (payload: any) => {
            const set = listeners.get(topic)
            if (set) for (const fn of set) fn(payload.new || payload.old)
          },
        )
        channel.subscribe()
        channels.set(topic, channel)
      }

      return () => {
        listeners.get(topic)?.delete(callback)
      }
    },

    websocket() {
      return undefined
    },
  }
}

// ---- Storage Provider ----

function makeStorageProvider(sbConfig: SupabaseConfig): StorageProvider {
  const client = makeSupabaseClient(sbConfig, true)
  const bucket = "Zorux"

  return {
    async upload(name: string, data: Uint8Array | Blob): Promise<string> {
      const buf = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data
      const { error } = await client.storage.from(bucket).upload(name, buf, { upsert: true })
      if (error) throw new Error(error.message)
      const { data: pubData } = client.storage.from(bucket).getPublicUrl(name)
      return pubData.publicUrl
    },

    url(path: string) {
      const { data } = client.storage.from(bucket).getPublicUrl(path)
      return data.publicUrl
    },
  }
}

// ---- Factory ----

export async function createSupabasePlatform(config: AppConfig, models: CompiledModel[]): Promise<PlatformAdapter> {
  const sbConfig = getSupabaseConfig(config)
  const db = makeDatabase(models, sbConfig)

  return {
    name: "supabase",
    config,
    models,
    database: db,
    auth: makeAuthProvider(models, sbConfig),
    realtime: makeRealtimeProvider(sbConfig),
    storage: makeStorageProvider(sbConfig),
  }
}
