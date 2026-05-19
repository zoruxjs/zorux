import { readFileSync } from "fs"
import { join } from "path"
import { load as yamlLoad } from "js-yaml"
import { appConfigSchema } from "../core/validation"
import { compileModels } from "../core/compiler"
import { createPlatform } from "../core/platform"
import type { CompiledModel, CompiledField } from "../core/types"

const firstNames = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Hank", "Ivy", "Jack", "Kate", "Leo", "Mia", "Noah", "Olivia", "Pete", "Quinn", "Rose", "Sam", "Tina"]
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
const words = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "aliquip"]

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)]
}

function randomString(minLen = 5, maxLen = 15): string {
  const len = rand(minLen, maxLen)
  let result = ""
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(rand(97, 122))
  }
  return result
}

let seedIdx = 0

function genValue(field: CompiledField, usedEmails?: Set<string>): any {
  if (field.enum && field.enum.length > 0) return pick(field.enum)

  const isEmail = field.name === "email" || field.type === "email"

  switch (field.type) {
    case "int": {
      const min = field.min ?? 0
      const max = field.max ?? 1000
      return rand(min, max)
    }
    case "float": {
      const min = field.min ?? 0
      const max = field.max ?? 1000
      return parseFloat((Math.random() * (max - min) + min).toFixed(2))
    }
    case "bool":
      return Math.random() > 0.5
    case "text":
      return Array.from({ length: rand(2, 5) }, () => pick(words)).join(" ") + ". " +
        Array.from({ length: rand(2, 5) }, () => pick(words)).join(" ") + "."
    default:
      if (isEmail) {
        seedIdx++
        let email = "seed" + seedIdx + "@test.com"
        if (usedEmails) usedEmails.add(email)
        return email
      }
      return pick(firstNames) + " " + pick(lastNames)
  }
}

function getSeedCount(model: CompiledModel, overrides: Record<string, number>): number {
  if (overrides[model.name] !== undefined) return overrides[model.name]
  return 5
}

export async function seedCommand(args: string[]) {
  const rootDir = process.cwd()
  const yamlPath = join(rootDir, "app.yaml")

  let raw: string
  try {
    raw = readFileSync(yamlPath, "utf-8")
  } catch {
    console.error("[Zorux] No app.yaml found in current directory")
    process.exit(1)
  }

  const parsed = yamlLoad(raw) as any
  const config = appConfigSchema.parse(parsed)
  const models = compileModels(config.models, config.auth?.model)

  // Parse seed overrides from CLI
  const overrides: Record<string, number> = {}
  const countFlagIdx = args.indexOf("--count")
  if (countFlagIdx >= 0 && args[countFlagIdx + 1]) {
    const val = parseInt(args[countFlagIdx + 1])
    if (!isNaN(val)) {
      for (const m of models) overrides[m.name] = val
    }
  }
  for (const arg of args) {
    const parts = arg.split(":")
    if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
      overrides[parts[0]] = parseInt(parts[1])
    }
  }

  console.log("  Seeding database...")

  const platform = await createPlatform(config, models)
  const createdIds: Record<string, number[]> = {}
  const usedEmails = new Set<string>()

  // Sort models by dependency order
  const sorted = topologicalSort(models)

  for (const model of sorted) {
    const count = getSeedCount(model, overrides)
    const col = platform.database.collection(model.tableName, model)
    const nonRelFields = model.fields.filter(f => !f.isRelation && f.name !== "password")
    const relFields = model.fields.filter(f => f.isRelation && f.relationType === "belongsTo")
    const authField = model.fields.find(f => f.name === "password")

    for (let i = 0; i < count; i++) {
      const data: Record<string, any> = {}

      for (const field of nonRelFields) {
        if (field.type === "email" || field.name === "email") {
          data[field.name] = genValue(field, usedEmails)
        } else {
          data[field.name] = genValue(field)
        }
      }

      for (const field of relFields) {
        const refModelName = field.relationModel
        if (refModelName && createdIds[refModelName]?.length > 0) {
          data[field.name + "Id"] = pick(createdIds[refModelName])
        }
      }

      if (authField || model.hasAuth) {
        data.password = await Bun.password.hash("password123")
        if (!data.email) data.email = genValue({ name: "email", type: "email", enum: undefined } as any, usedEmails)
        if (!data.name) data.name = pick(firstNames) + " " + pick(lastNames)
      }

      const created = await col.insert(data)
      if (created?.id) {
        if (!createdIds[model.name]) createdIds[model.name] = []
        createdIds[model.name].push(created.id)
      }
    }

    if (createdIds[model.name]?.length > 0) {
      console.log("  - " + model.name + ": " + createdIds[model.name].length + " records created")
    }
  }

  platform.database.close()
  console.log("  Done!")
}

function topologicalSort(models: CompiledModel[]): CompiledModel[] {
  const visited = new Set<string>()
  const sorted: CompiledModel[] = []
  const modelMap = new Map(models.map(m => [m.name, m]))

  function visit(name: string) {
    if (visited.has(name)) return
    visited.add(name)
    const model = modelMap.get(name)
    if (model) {
      for (const field of model.fields) {
        if (field.isRelation && field.relationType === "belongsTo" && field.relationModel) {
          visit(field.relationModel)
        }
      }
      sorted.push(model)
    }
  }

  for (const model of models) visit(model.name)
  return sorted
}
