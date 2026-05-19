import type { AppConfig } from "./types"
import { parseAppConfig } from "./yaml"
import { compileModels, compileModel } from "./compiler"
import { createDrizzleSchema } from "./schema"
import { createRouter } from "./router"
import { loadActions } from "./actions"

function createApi(config: AppConfig) {
  const models = compileModels(config.models)
  const schema = createDrizzleSchema(config, models)
  const app = createRouter(config, models, schema, {})
  return { app, config, models, schema }
}

// Public API for action files
export const F = {
  public: (handler: any) => ({ policy: "public", handler }),
  auth: (handler: any) => ({ policy: "auth", handler }),
  role: (role: string) => ({
    run: (handler: any) => ({ policy: "role", role, handler }),
  }),
  owner: (field: string) => ({
    run: (handler: any) => ({ policy: "owner", ownerField: field, handler }),
  }),
  html: (strings: TemplateStringsArray, ...values: any[]) => {
    let result = ""
    strings.forEach((str, i) => {
      result += str + (values[i] !== undefined ? values[i] : "")
    })
    return new Response(result, { headers: { "Content-Type": "text/html" } })
  },
  json: (data: any) => new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  }),
}

export { parseAppConfig, compileModels, compileModel, createDrizzleSchema, createRouter, loadActions, createApi }
export type { AppConfig } from "./types"
