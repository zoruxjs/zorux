import type { CompiledModel } from "./types"

export interface DataCollection {
  find(sort?: string, order?: string, limit?: number, offset?: number): any[]
  findById(id: any): any
  findBy(field: string, value: any): any
  insert(data: Record<string, any>): any
  update(id: any, data: Record<string, any>): void
  deleteById(id: any): void
  count(): number
  search(fields: string[], term: string, sort?: string, order?: string, limit?: number, offset?: number): { rows: any[]; total: number }
}

export interface DatabaseAdapter {
  collection(tableName: string, model?: CompiledModel): DataCollection
  run(sql: string, params?: any[]): void
  get?(sql: string, params?: any[]): any
  all?(sql: string, params?: any[]): any[]
  connect(): Promise<void>
  close(): void
}

// ---- SQL-based implementation ----

class SQLCollection implements DataCollection {
  constructor(private adapter: SQLAdapter, public tableName: string, private model?: CompiledModel) {}

  find(sort = "id", order = "ASC", limit = 0, offset = 0): any[] {
    let sql = "SELECT * FROM " + this.tableName
    const safeSort = this.model?.fields.find(f => f.name === sort) ? sort : "id"
    sql += " ORDER BY " + safeSort + " " + (order === "DESC" ? "DESC" : "ASC")
    if (limit > 0) sql += " LIMIT ? OFFSET ?"
    return limit > 0 ? this.adapter.all(sql, [limit, offset]) : this.adapter.all(sql)
  }

  findById(id: any): any {
    return this.adapter.get("SELECT * FROM " + this.tableName + " WHERE id = ?", [id])
  }

  findBy(field: string, value: any): any {
    return this.adapter.get("SELECT * FROM " + this.tableName + " WHERE " + field + " = ?", [value])
  }

  insert(data: Record<string, any>): any {
    const keys = Object.keys(data)
    const vals = Object.values(data)
    const sql = "INSERT INTO " + this.tableName + " (" + keys.join(", ") + ") VALUES (" + keys.map(() => "?").join(", ") + ")"
    this.adapter.run(sql, vals)
    const lastId = this.adapter.getLastInsertId()
    return lastId ? this.adapter.get("SELECT * FROM " + this.tableName + " WHERE id = ?", [lastId]) : null
  }

  update(id: any, data: Record<string, any>): void {
    const keys = Object.keys(data)
    const vals = Object.values(data)
    const sql = "UPDATE " + this.tableName + " SET " + keys.map(k => k + " = ?").join(", ") + " WHERE id = ?"
    this.adapter.run(sql, [...vals, id])
  }

  deleteById(id: any): void {
    this.adapter.run("DELETE FROM " + this.tableName + " WHERE id = ?", [id])
  }

  count(): number {
    const row = this.adapter.get("SELECT COUNT(*) as cnt FROM " + this.tableName)
    return row?.cnt || 0
  }

  search(fields: string[], term: string, sort = "id", order = "ASC", limit = 20, offset = 0): { rows: any[]; total: number } {
    const safeSort = this.model?.fields.find(f => f.name === sort) ? sort : "id"
    if (!term || fields.length === 0) {
      const total = this.count()
      const rows = this.find(safeSort, order, limit, offset)
      return { rows, total }
    }
    const conds = fields.map(f => f + " LIKE ?")
    const params = fields.map(() => "%" + term + "%")
    const where = " WHERE " + conds.join(" OR ")
    const totalRow = this.adapter.get("SELECT COUNT(*) as cnt FROM " + this.tableName + where, params)
    const total = totalRow?.cnt || 0
    const rows = this.adapter.all("SELECT * FROM " + this.tableName + where + " ORDER BY " + safeSort + " " + order + " LIMIT ? OFFSET ?", [...params, limit, offset])
    return { rows, total }
  }
}

class SQLAdapter implements DatabaseAdapter {
  constructor(private impl: { all: Function; get: Function; run: Function; getLastInsertId: Function }) {}

  collection(tableName: string, model?: CompiledModel): DataCollection {
    return new SQLCollection(this, tableName, model)
  }

  all(sql: string, params?: any[]): any[] { return this.impl.all(sql, params) }
  get(sql: string, params?: any[]): any { return this.impl.get(sql, params) }
  run(sql: string, params?: any[]): void { this.impl.run(sql, params) }
  getLastInsertId(): number { return this.impl.getLastInsertId() }
  connect(): Promise<void> { return Promise.resolve() }
  close(): void {}
}

// ---- MongoDB implementation ----

class MongoCollection implements DataCollection {
  private col: any
  constructor(private db: any, public tableName: string, private model?: CompiledModel) {
    this.col = db.collection(tableName)
  }

  private toId(v: any): any {
    if (typeof v === "string" && v.length === 24 && /^[0-9a-f]+$/i.test(v)) {
      const { ObjectId } = require("mongodb")
      return new ObjectId(v)
    }
    return v
  }

  private mapOut(doc: any): any {
    if (!doc) return null
    const out: any = { id: doc._id?.toString?.() || doc._id }
    for (const k of Object.keys(doc)) {
      if (k !== "_id") out[k] = doc[k]
    }
    return out
  }

  find(sort = "id", order = "ASC", limit = 0, offset = 0): any[] {
    const opts: any = {}
    if (sort !== "id") opts.sort = [[sort, order === "DESC" ? -1 : 1]]
    if (limit > 0) { opts.limit = limit; opts.skip = offset }
    return this.col.find({}, opts).toArray().map((d: any) => this.mapOut(d))
  }

  findById(id: any): any {
    return this.col.findOne({ _id: this.toId(id) }).then((d: any) => this.mapOut(d))
  }

  findBy(field: string, value: any): any {
    return this.col.findOne({ [field]: value }).then((d: any) => this.mapOut(d))
  }

  async insert(data: Record<string, any>): Promise<any> {
    const res = await this.col.insertOne(data)
    return this.mapOut({ ...data, _id: res.insertedId })
  }

  async update(id: any, data: Record<string, any>): Promise<void> {
    await this.col.updateOne({ _id: this.toId(id) }, { $set: data })
  }

  async deleteById(id: any): Promise<void> {
    await this.col.deleteOne({ _id: this.toId(id) })
  }

  async count(): Promise<number> {
    return this.col.countDocuments()
  }

  async search(fields: string[], term: string, sort = "id", order = "ASC", limit = 20, offset = 0): Promise<{ rows: any[]; total: number }> {
    if (!term || fields.length === 0) {
      const total = await this.count()
      const rows = await this.find(sort, order, limit, offset)
      return { rows, total }
    }
    const orCond = fields.map(f => ({ [f]: { $regex: term, $options: "i" } }))
    const filter = { $or: orCond }
    const total = await this.col.countDocuments(filter)
    const opts: any = { limit, skip: offset }
    if (sort !== "id") opts.sort = [[sort, order === "DESC" ? -1 : 1]]
    const rows = await this.col.find(filter, opts).toArray().then((arr: any[]) => arr.map((d: any) => this.mapOut(d)))
    return { rows, total }
  }
}

class MongoAdapter implements DatabaseAdapter {
  private client: any
  private db: any
  private dbName: string
  private url: string

  constructor(url: string) {
    this.url = url
    this.dbName = new URL(url).pathname.replace(/^\//, "") || "Zorux"
  }

  async connect(): Promise<void> {
    const { MongoClient } = require("mongodb")
    this.client = new MongoClient(this.url)
    await this.client.connect()
    this.db = this.client.db(this.dbName)
  }

  collection(tableName: string, model?: CompiledModel): DataCollection {
    return new MongoCollection(this.db, tableName, model)
  }

  run(sql: string, params?: any[]): void {}
  close(): void { this.client.close() }
}

// ---- Factory ----

export function createAdapter(provider: string, url?: string): DatabaseAdapter {
  const dbUrl = process.env.DATABASE_URL || url || ":memory:"

  if (provider === "mongodb") {
    return new MongoAdapter(dbUrl)
  }

  if (provider === "postgres" || provider === "pg") {
    const postgres = require("postgres")
    const sql = postgres(dbUrl)
    return new SQLAdapter({
      all: (q: string, p?: any[]) => p ? sql.unsafe(q, p) : sql.unsafe(q),
      get: (q: string, p?: any[]) => { const r = p ? sql.unsafe(q, p) : sql.unsafe(q); return r[0] || null },
      run: (q: string, p?: any[]) => { p ? sql.unsafe(q, p) : sql.unsafe(q) },
      getLastInsertId: () => 0,
    })
  }

  if (provider === "mysql") {
    const mysql2 = require("mysql2/promise")
    const pool = mysql2.createPool(dbUrl)
    return new SQLAdapter({
      all: async (q: string, p?: any[]) => { const [r] = await pool.query(q, p || []); return r },
      get: async (q: string, p?: any[]) => { const [r] = await pool.query(q, p || []); return r[0] || null },
      run: async (q: string, p?: any[]) => { await pool.query(q, p || []) },
      getLastInsertId: async () => { const [r] = await pool.query("SELECT LAST_INSERT_ID() as id"); return r[0].id },
    })
  }

  if (provider === "cloudflare-d1" || provider === "cf-d1") {
    const { createD1Database } = require("./cloudflare")
    return createD1Database(dbUrl)
  }

  // SQLite default
  const { Database } = require("bun:sqlite")
  const bunDb = new Database(dbUrl === ":memory:" ? ":memory:" : dbUrl)
  bunDb.run("PRAGMA journal_mode=WAL")
  // Prepared statement cache
  const stmtCache = new Map<string, any>()
  function prep(sql: string): any {
    let s = stmtCache.get(sql)
    if (!s) { s = bunDb.prepare(sql); stmtCache.set(sql, s) }
    return s
  }
  return new SQLAdapter({
    all: (q: string, p?: any[]) => { const s = prep(q); return p ? s.all(...p) : s.all() },
    get: (q: string, p?: any[]) => { const s = prep(q); return p ? s.get(...p) : s.get() },
    run: (q: string, p?: any[]) => { const s = prep(q); p ? s.run(...p) : s.run() },
    getLastInsertId: () => (prep("SELECT last_insert_rowid() as id").get() as any).id,
  })
}

export function mapType(provider: string, fieldType: string): string {
  if (provider === "postgres" || provider === "mongodb" || provider === "cloudflare-d1" || provider === "cf-d1") {
    if (fieldType === "int" || fieldType === "bool") return "INTEGER"
    if (fieldType === "float") return "REAL"
    return "TEXT"
  }
  if (["int", "bool", "number", "boolean"].includes(fieldType)) return "INTEGER"
  if (fieldType === "float") return "REAL"
  return "TEXT"
}

export function quoteIdent(provider: string, name: string): string {
  if (provider === "postgres" || provider === "mysql") return '"' + name + '"'
  return name
}

export function isD1(provider: string): boolean {
  return provider === "cloudflare-d1" || provider === "cf-d1"
}
