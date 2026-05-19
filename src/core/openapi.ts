import type { PlatformAdapter } from "./platform"
import type { CompiledField, CompiledModel } from "./types"
import { getVersion } from "./version"

function toTsType(field: CompiledField): string {
  if (field.type === "int" || field.type === "bool") return "integer"
  if (field.type === "float") return "number"
  if (field.enum) return "string"
  return "string"
}

function toTsTypeInput(field: CompiledField): string {
  if (field.type === "int" || field.type === "bool") return "integer"
  if (field.type === "float") return "number"
  if (field.type === "file") return "string"
  return "string"
}

function toOpenApiType(field: CompiledField, forInput: boolean): any {
  if (field.type === "file") {
    return forInput ? { type: "string", format: "binary" } : { type: "string" }
  }
  if (field.type === "int" || field.type === "bool") return { type: "integer" }
  if (field.type === "float") return { type: "number" }
  const prop: any = { type: "string" }
  if (field.enum) prop.enum = field.enum
  return prop
}

function modelSchema(model: CompiledModel, forInput = false) {
  const props: Record<string, any> = {}
  const required: string[] = []

  if (!forInput) {
    props.id = { type: "integer", readOnly: true }
  }

  for (const field of model.fields) {
    if (field.isRelation) {
      if (field.relationType === "belongsTo") {
        const fkName = field.name + "Id"
        props[fkName] = { type: "integer", nullable: true }
      }
      continue
    }
    const prop = toOpenApiType(field, forInput)
    if (field.defaultValue !== undefined && field.type !== "file") prop.default = field.defaultValue
    if (!forInput && field.min !== undefined) prop.minimum = field.min
    if (!forInput && field.max !== undefined) prop.maximum = field.max
    if (field.isRequired && forInput) required.push(field.name)
    props[field.name] = prop
  }

  if (model.hasTimestamps && !forInput) {
    props.created_at = { type: "string", format: "date-time", readOnly: true }
    props.updated_at = { type: "string", format: "date-time", readOnly: true }
  }

  const schema: any = { type: "object", properties: props }
  if (required.length > 0) schema.required = required
  return schema
}

function modelPaths(model: CompiledModel, needsAuth: boolean) {
  const base = "/api/" + model.tableName
  const ref = "#/components/schemas/" + model.name
  const inputRef = "#/components/schemas/" + model.name + "Input"
  const security = needsAuth ? [{ bearerAuth: [] }] : undefined

  const listParams: any[] = [
    { name: "search", in: "query", schema: { type: "string" }, description: "Search across text fields" },
    { name: "sort", in: "query", schema: { type: "string" }, description: "Sort field" },
    { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
    { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
    { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100, minimum: 1 } },
    { name: "include", in: "query", schema: { type: "string" }, description: "Comma-separated relations to include" },
  ]

  const paginationSchema = {
    type: "object",
    properties: {
      page: { type: "integer" },
      limit: { type: "integer" },
      total: { type: "integer" },
      totalPages: { type: "integer" },
    },
  }

  const paths: Record<string, any> = {}

  paths[base] = {
    get: {
      summary: "List " + model.plural,
      tags: [model.name],
      parameters: listParams,
      security,
      responses: {
        "200": {
          description: "Paginated list of " + model.plural,
          content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: ref } }, pagination: paginationSchema } } } },
        },
      },
    },
    post: {
      summary: "Create " + model.name,
      tags: [model.name],
      security,
      requestBody: { required: true, content: { "application/json": { schema: { $ref: inputRef } } } },
      responses: {
        "201": { description: "Created " + model.name, content: { "application/json": { schema: { $ref: ref } } } },
        "400": { description: "Validation error" },
      },
    },
  }

  paths[base + "/{id}"] = {
    get: {
      summary: "Get " + model.name + " by ID",
      tags: [model.name],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
        { name: "include", in: "query", schema: { type: "string" }, description: "Comma-separated relations to include" },
      ],
      security,
      responses: { "200": { description: model.name + " object", content: { "application/json": { schema: { $ref: ref } } } } },
    },
    put: {
      summary: "Update " + model.name,
      tags: [model.name],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      security,
      requestBody: { required: true, content: { "application/json": { schema: { $ref: inputRef } } } },
      responses: { "200": { description: "Updated " + model.name, content: { "application/json": { schema: { $ref: ref } } } } },
    },
    delete: {
      summary: "Delete " + model.name,
      tags: [model.name],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      security,
      responses: { "200": { description: "Deletion result", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } } },
    },
  }

  return paths
}

function authPaths() {
  const paths: Record<string, any> = {
    "/api/auth/register": {
      post: {
        summary: "Register a new user",
        tags: ["Auth"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 6 } }, required: ["email", "password"] } } } },
        responses: { "201": { description: "User registered", content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" }, user: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, email: { type: "string" } } } } } } } } },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Login with email and password",
        tags: ["Auth"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" }, password: { type: "string" } }, required: ["email", "password"] } } } },
        responses: { "200": { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResult" } } } } },
      },
    },
    "/api/auth/me": {
      get: {
        summary: "Get current user profile",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Current user", content: { "application/json": { schema: { type: "object", properties: { user: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, email: { type: "string" } } } } } } } } },
      },
    },
  }
  return paths
}

export function generateOpenApiSpec(platform: PlatformAdapter): Record<string, any> {
  const { config, models } = platform

  const schemas: Record<string, any> = {}
  const paths: Record<string, any> = {}

  for (const model of models) {
    schemas[model.name] = modelSchema(model, false)
    schemas[model.name + "Input"] = modelSchema(model, true)
    const needsAuth = model.hasAuth
    const mp = modelPaths(model, needsAuth)
    Object.assign(paths, mp)
  }

  Object.assign(paths, authPaths())

  schemas.AuthResult = {
    type: "object",
    properties: {
      token: { type: "string" },
      user: {
        type: "object",
        properties: { id: { type: "integer" }, name: { type: "string" }, email: { type: "string" } },
      },
    },
  }

  return {
    openapi: "3.0.3",
    info: {
      title: config.name,
      version: getVersion(),
      description: "Zorux API - " + config.type + " project",
    },
    servers: [{ url: "/" }],
    paths,
    components: {
      schemas,
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  }
}

export function swaggerUiHtml(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zorux API Docs</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:"${specUrl}",dom_id:"#swagger-ui"})</script></body>
</html>`
}
