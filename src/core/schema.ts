import type { CompiledModel, AppConfig } from "./types"
import { createAdapter, type DatabaseAdapter } from "./db"

export interface GeneratedSchema {
  adapter: DatabaseAdapter
  provider: string
}

export async function createDrizzleSchema(config: AppConfig, models: CompiledModel[]): Promise<GeneratedSchema> {
  const provider = config.database.provider
  const adapter = createAdapter(provider, config.database.url)
  await adapter.connect()

  if (provider !== "mongodb") {
    await createTables(provider, adapter, models)
  }

  return { adapter, provider }
}

async function createTables(provider: string, adapter: DatabaseAdapter, models: CompiledModel[]) {
  for (const model of models) {
    const cols: string[] = []
    const constraints: string[] = []
    const q = (n: string) => n
    const isUUID = model.idType === "uuid"

    // Primary key
    if (isUUID) {
      cols.push(q("id") + " TEXT PRIMARY KEY")
    } else if (provider === "postgres") {
      cols.push(q("id") + " SERIAL PRIMARY KEY")
    } else {
      cols.push(q("id") + " INTEGER PRIMARY KEY AUTOINCREMENT")
    }

    // FK type: match the referenced model's id type
    function refColType(refModelName: string): string {
      const ref = models.find(m => m.name === refModelName)
      return ref?.idType === "uuid" ? "TEXT" : "INTEGER"
    }

    for (const field of model.fields) {
      if (field.isRelation && field.relationType === "belongsTo") {
        const fkName = q(field.name + "Id")
        const colType = field.relationModel ? refColType(field.relationModel) : "INTEGER"
        cols.push(fkName + " " + colType)
        if (field.relationModel && field.relationModel !== "Organization") {
          const refTable = q(field.relationModel.toLowerCase() + "s")
          const refIdType = refColType(field.relationModel) === "TEXT" ? "TEXT" : "INTEGER"
          constraints.push("FOREIGN KEY (" + fkName + ") REFERENCES " + refTable + "(" + q("id") + ")")
        }
        continue
      }

      let st = "TEXT"
      if (["int", "bool", "number", "boolean"].includes(field.type)) st = "INTEGER"
      if (field.type === "float") st = "REAL"
      let def = q(field.name) + " " + st
      if (field.isRequired) def += " NOT NULL"
      if (field.isUnique) def += " UNIQUE"
      cols.push(def)
    }

    if (model.hasAuth) cols.push(q("password") + " TEXT NOT NULL")
    if (model.softDelete) {
      cols.push(q("deleted_at") + " " + (provider === "postgres" ? "TIMESTAMP" : "TEXT"))
    }
    if (model.hasTimestamps) {
      cols.push(q("created_at") + (provider === "postgres" ? " TIMESTAMP" : " TEXT") + " DEFAULT CURRENT_TIMESTAMP")
      cols.push(q("updated_at") + (provider === "postgres" ? " TIMESTAMP" : " TEXT") + " DEFAULT CURRENT_TIMESTAMP")
    }

    const sql = "CREATE TABLE IF NOT EXISTS " + q(model.tableName) + " (" + cols.concat(constraints).join(", ") + ")"
    adapter.run(sql)
  }
}
