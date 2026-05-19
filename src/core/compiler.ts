import type { CompiledField, CompiledModel, ModelDef } from "./types"

function parseFieldType(typeStr: string): { baseType: string; enumValues?: string[] } {
  if (typeStr.endsWith("]")) {
    const inner = typeStr.slice(0, -2)
    return { baseType: inner, enumValues: undefined }
  }
  if (typeStr.startsWith("enum(")) {
    const values = typeStr.slice(5, -1).split(",").map(v => v.trim())
    return { baseType: "enum", enumValues: values }
  }
  return { baseType: typeStr, enumValues: undefined }
}

function inferPlural(name: string): string {
  if (name.endsWith("y")) return name.slice(0, -1) + "ies"
  if (name.endsWith("s")) return name + "es"
  return name + "s"
}

function snakeCase(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "")
}

function isModelReference(type: string, knownModels?: string[]): boolean {
  const base = type.endsWith("[]") ? type.slice(0, -2) : type
  if (/^[A-Z]/.test(base)) return true
  if (knownModels && knownModels.includes(base)) return true
  return false
}

function parseStrValue(parts: string[], prefix: string): string | undefined {
  const p = parts.find(s => s.startsWith(prefix + ":"))
  return p ? p.split(":").slice(1).join(":") : undefined
}

export function compileModel(name: string, def: ModelDef, knownModels?: string[]): CompiledModel {
  const fields: CompiledField[] = []

  for (const [rawName, rawDef] of Object.entries(def.fields)) {
    let fieldType: string
    let isRequired = false
    let isUnique = false
    let defaultValue: unknown = undefined
    let min: number | undefined
    let max: number | undefined
    let pattern: string | undefined
    let enumVals: string[] | undefined

    if (typeof rawDef === "string") {
      const parts = rawDef.split(" ")
      fieldType = parts[0]
      if (parts.includes("required")) isRequired = true
      if (parts.includes("unique")) isUnique = true
      const dv = parseStrValue(parts, "default")
      if (dv !== undefined) defaultValue = dv
      const mn = parseStrValue(parts, "min")
      if (mn !== undefined) min = Number(mn)
      const mx = parseStrValue(parts, "max")
      if (mx !== undefined) max = Number(mx)
      const pt = parseStrValue(parts, "pattern")
      if (pt !== undefined) pattern = pt
      const ev = parseStrValue(parts, "enum")
      if (ev !== undefined) enumVals = ev.split(",").map(v => v.trim())
    } else {
      fieldType = rawDef.type
      isRequired = rawDef.required ?? false
      isUnique = rawDef.unique ?? false
      defaultValue = rawDef.default
      min = rawDef.min
      max = rawDef.max
      pattern = rawDef.pattern
      enumVals = rawDef.enum
    }

    const parsed = parseFieldType(fieldType)
    const isRelation = isModelReference(parsed.baseType, knownModels)

    let relationType: "belongsTo" | "hasMany" | "manyToMany" | undefined
    let relationModel: string | undefined

    if (isRelation) {
      if (parsed.baseType.endsWith("[]")) {
        relationModel = parsed.baseType.slice(0, -2)
        relationType = "manyToMany"
      } else {
        relationModel = parsed.baseType
        relationType = "belongsTo"
      }
    }

    fields.push({
      name: rawName,
      type: parsed.baseType,
      isRequired,
      isUnique,
      defaultValue,
      min,
      max,
      pattern,
      enum: enumVals,
      isRelation,
      relationModel,
      relationType,
    })
  }

  const isScoped = !!def.scoped

  // Auto-add orgId field for scoped models if not already defined
  if (isScoped && !fields.find(f => f.name === "org" || f.name === "orgId")) {
    fields.unshift({
      name: "org",
      isRequired: true,
      isUnique: false,
      defaultValue: undefined,
      isRelation: true,
      relationModel: "Organization",
      relationType: "belongsTo",
    })
  }

  return {
    name,
    plural: inferPlural(name),
    tableName: snakeCase(inferPlural(name)),
    fields,
    hasAuth: !!def.auth,
    hasTimestamps: def.timestamps,
    policies: def.policies,
    fieldPolicies: def.fieldPolicies,
    derivedRoles: def.derivedRoles,
    isScoped,
    idType: def.id || "int",
    softDelete: def.softDelete,
  }
}

export function compileModels(models: Record<string, ModelDef>, authModelName?: string): CompiledModel[] {
  const modelNames = Object.keys(models)
  const result = Object.entries(models).map(([name, def]) => compileModel(name, def, modelNames))

  // Auto-detect ownerField for each model
  if (authModelName) {
    const authTable = snakeCase(inferPlural(authModelName))
    for (const model of result) {
      const ownerField = model.fields.find(f => f.isRelation && f.relationType === "belongsTo" && f.relationModel === authModelName)
      if (ownerField) model.ownerField = ownerField.name + "Id"
    }
  }

  return result
}
