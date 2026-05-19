import type { CompiledModel } from "../types"
import type { DataCollection } from "../db"

// ═══════════════════════════════════════════════════
// GraphQL Schema Generator
// ═══════════════════════════════════════════════════

function toGqlType(fieldType: string): string {
  if (fieldType === "int" || fieldType === "bool") return "Int"
  if (fieldType === "float") return "Float"
  return "String"
}

function generateModelType(model: CompiledModel): { typeDefs: string; resolvers: any } {
  const fields = model.fields.filter(f => !f.isRelation && f.name !== "password")
  const relFields = model.fields.filter(f => f.isRelation && f.relationType === "belongsTo")

  const fieldDefs = fields.map(f => {
    const gqlType = toGqlType(f.type)
    return `  ${f.name}${f.isRequired ? "!" : ""}: ${gqlType}`
  })

  // Add relation fields
  for (const rf of relFields) {
    fieldDefs.push(`  ${rf.name}: ${rf.relationModel}`)
    fieldDefs.push(`  ${rf.name}Id: Int`)
  }

  if (model.hasTimestamps) {
    fieldDefs.push("  createdAt: String")
    fieldDefs.push("  updatedAt: String")
  }

  const inputFields = fields.map(f => {
    const gqlType = toGqlType(f.type)
    if (f.type === "file") return ""
    return `  ${f.name}: ${gqlType}`
  }).filter(Boolean)

  for (const rf of relFields) {
    inputFields.push(`  ${rf.name}Id: Int`)
  }

  const typeDefs = `
type ${model.name} {
  id: ID!
${fieldDefs.join("\n")}
}

input ${model.name}Input {
${inputFields.join("\n")}
}

type ${model.name}Result {
  data: [${model.name}!]!
  pagination: Pagination!
}
`

  // Resolvers
  const resolvers: any = {
    Query: {
      [`${model.tableName}`]: async (_: any, args: { id: any }, ctx: any) => {
        const col = ctx.collections[model.tableName]
        const row = await col.findById(args.id)
        if (!row) return null
        // Resolve relations
        for (const rf of relFields) {
          if (row[rf.name + "Id"]) {
            const refCol = ctx.collections[rf.relationModel?.toLowerCase() + "s"]
            if (refCol) row[rf.name] = await refCol.findById(row[rf.name + "Id"])
          }
        }
        return row
      },
      [`${model.tableName}List`]: async (_: any, args: { page?: number; limit?: number; search?: string; sort?: string; order?: string }, ctx: any) => {
        const col = ctx.collections[model.tableName]
        const searchFields = model.fields.filter(f => !f.isRelation && (f.type === "string" || f.type === "text")).map(f => f.name)
        const page = args.page || 1
        const limit = args.limit || 20
        const sort = args.sort || "id"
        const order = args.order || "asc"
        const offset = (page - 1) * limit
        const { rows, total } = await col.search(searchFields, args.search || "", sort, order, limit, offset)
        return {
          data: rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        }
      },
    },
    Mutation: {
      [`create${model.name}`]: async (_: any, args: { data: any }, ctx: any) => {
        const col = ctx.collections[model.tableName]
        return await col.insert(args.data)
      },
      [`update${model.name}`]: async (_: any, args: { id: any; data: any }, ctx: any) => {
        const col = ctx.collections[model.tableName]
        await col.update(args.id, args.data)
        return await col.findById(args.id)
      },
      [`delete${model.name}`]: async (_: any, args: { id: any }, ctx: any) => {
        const col = ctx.collections[model.tableName]
        await col.deleteById(args.id)
        return { success: true }
      },
    },
  }

  return { typeDefs, resolvers }
}

// ═══════════════════════════════════════════════════
// Build Schema
// ═══════════════════════════════════════════════════

export function buildGraphQLSchema(models: CompiledModel[], database: { collection: Function }) {
  let allTypeDefs = `
type Pagination {
  page: Int!
  limit: Int!
  total: Int!
  totalPages: Int!
}

type DeleteResult {
  success: Boolean!
}

type Query {
  _service: String
}

type Mutation {
  _service: String
}
`

  const allResolvers: any = { Query: {}, Mutation: {} }
  const collections: Record<string, DataCollection> = {}

  for (const model of models) {
    collections[model.tableName] = database.collection(model.tableName, model)
    const { typeDefs, resolvers } = generateModelType(model)

    // Add list query
    const listFields = model.fields.filter(f => !f.isRelation && (f.type === "string" || f.type === "text")).map(f => f.name)

    allTypeDefs += typeDefs
    allTypeDefs += `extend type Query {
  ${model.tableName}(id: ID!): ${model.name}
  ${model.tableName}List(page: Int, limit: Int, search: String, sort: String, order: String): ${model.name}Result!
}

extend type Mutation {
  create${model.name}(data: ${model.name}Input!): ${model.name}
  update${model.name}(id: ID!, data: ${model.name}Input!): ${model.name}
  delete${model.name}(id: ID!): DeleteResult!
}
`

    Object.assign(allResolvers.Query, resolvers.Query)
    Object.assign(allResolvers.Mutation, resolvers.Mutation)
  }

  return {
    typeDefs: allTypeDefs,
    resolvers: allResolvers,
    collections,
  }
}

// ═══════════════════════════════════════════════════
// Hono Handler
// ═══════════════════════════════════════════════════

export function createGraphQLHandler(models: CompiledModel[], database: { collection: Function }) {
  const { typeDefs, resolvers, collections } = buildGraphQLSchema(models, database)

  return async (c: any) => {
    try {
      const { buildSchema, graphql } = require("graphql")
      const schema = buildSchema(typeDefs)

      const body = await c.req.json()
      const query = body.query
      const variables = body.variables || {}

      const result = await graphql({
        schema,
        source: query,
        rootValue: resolvers,
        contextValue: { collections },
        variableValues: variables,
      })

      return c.json(result)
    } catch (err: any) {
      return c.json({ errors: [{ message: err.message }] }, 500)
    }
  }
}
