import type { CompiledField } from "./types"

export interface ValidationError {
  field: string
  message: string
}

export function validateField(field: CompiledField, value: any): ValidationError | null {
  const name = field.name

  if (field.isRequired) {
    if (value === null || value === undefined || value === "") {
      return { field: name, message: name + " is required" }
    }
  }

  if (value === null || value === undefined || value === "") return null

  if (field.enum && field.enum.length > 0) {
    if (!field.enum.includes(String(value))) {
      return { field: name, message: name + " must be one of: " + field.enum.join(", ") }
    }
  }

  if (field.pattern) {
    try {
      const re = new RegExp(field.pattern)
      if (!re.test(String(value))) {
        return { field: name, message: name + " does not match required pattern" }
      }
    } catch {}
  }

  if (field.type === "int" || field.type === "float") {
    const num = Number(value)
    if (isNaN(num)) {
      return { field: name, message: name + " must be a number" }
    }
    if (field.min !== undefined && num < field.min) {
      return { field: name, message: name + " must be at least " + field.min }
    }
    if (field.max !== undefined && num > field.max) {
      return { field: name, message: name + " must be at most " + field.max }
    }
  }

  if (field.type === "string" || field.type === "text") {
    const str = String(value)
    if (field.min !== undefined && str.length < field.min) {
      return { field: name, message: name + " must be at least " + field.min + " characters" }
    }
    if (field.max !== undefined && str.length > field.max) {
      return { field: name, message: name + " must be at most " + field.max + " characters" }
    }
  }

  return null
}

export function validateFields(fields: CompiledField[], data: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = []
  for (const field of fields) {
    if (field.isRelation) continue
    const err = validateField(field, data[field.name])
    if (err) errors.push(err)
  }
  return errors
}
