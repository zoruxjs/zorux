import { describe, test, expect } from "bun:test"
import { validateField, validateFields } from "../src/core/validate"
import { appConfigSchema } from "../src/core/validation"

describe("validateField", () => {
  const stringField = { name: "title", type: "string", isRequired: true, isUnique: false, defaultValue: undefined, isRelation: false }
  const intField = { name: "age", type: "int", isRequired: false, isUnique: false, defaultValue: undefined, isRelation: false, min: 0, max: 150 }
  const enumField = { name: "role", type: "string", isRequired: true, isUnique: false, defaultValue: undefined, isRelation: false, enum: ["admin", "user"] }

  test("passes for valid required string", () => {
    expect(validateField(stringField, "hello")).toBeNull()
  })

  test("fails for empty required string", () => {
    expect(validateField(stringField, "")).not.toBeNull()
  })

  test("fails for null required", () => {
    expect(validateField(stringField, null)).not.toBeNull()
  })

  test("passes for optional null", () => {
    const opt = { ...stringField, isRequired: false }
    expect(validateField(opt, null)).toBeNull()
  })

  test("validates int range", () => {
    expect(validateField(intField, 25)).toBeNull()
    expect(validateField(intField, -1)).not.toBeNull()
    expect(validateField(intField, 200)).not.toBeNull()
  })

  test("validates int non-numeric", () => {
    expect(validateField(intField, "abc")).not.toBeNull()
  })

  test("validates enum values", () => {
    expect(validateField(enumField, "admin")).toBeNull()
    expect(validateField(enumField, "user")).toBeNull()
    expect(validateField(enumField, "moderator")).not.toBeNull()
  })

  test("pattern validation", () => {
    const patternField = { ...stringField, pattern: "^[a-z]+$" }
    expect(validateField(patternField, "hello")).toBeNull()
    expect(validateField(patternField, "Hello123")).not.toBeNull()
  })

  test("string min length", () => {
    const minField = { ...stringField, min: 3 }
    expect(validateField(minField, "ab")).not.toBeNull()
    expect(validateField(minField, "abc")).toBeNull()
  })

  test("string max length", () => {
    const maxField = { ...stringField, max: 5 }
    expect(validateField(maxField, "abcdef")).not.toBeNull()
    expect(validateField(maxField, "abcde")).toBeNull()
  })
})

describe("validateFields", () => {
  const fields = [
    { name: "title", type: "string", isRequired: true, isUnique: false, defaultValue: undefined, isRelation: false },
    { name: "age", type: "int", isRequired: false, isUnique: false, defaultValue: undefined, isRelation: false },
  ]

  test("passes all valid fields", () => {
    expect(validateFields(fields, { title: "Hello", age: 25 })).toEqual([])
  })

  test("reports all errors", () => {
    const errors = validateFields(fields, { title: "", age: "abc" })
    expect(errors.length).toBe(2)
  })

  test("skips relation fields", () => {
    const withRel = [...fields, { name: "author", type: "user", isRequired: true, isUnique: false, defaultValue: undefined, isRelation: true }]
    expect(validateFields(withRel, { title: "Hello" })).toEqual([])
  })
})

describe("appConfigSchema", () => {
  test("validates minimal config", () => {
    const config = {
      name: "test-app",
      models: { item: { fields: { name: { type: "string", required: true } }, timestamps: false } },
    }
    const result = appConfigSchema.safeParse(config)
    expect(result.success).toBe(true)
  })

  test("rejects config without name", () => {
    const result = appConfigSchema.safeParse({ models: {} })
    expect(result.success).toBe(false)
  })

  test("accepts full config", () => {
    const config = {
      name: "full-app",
      type: "fullstack",
      database: { provider: "postgres", url: "postgres://localhost/mydb" },
      auth: { model: "user", registration: "invite" },
      models: {
        user: { fields: { email: { type: "string" } }, auth: "email", timestamps: true },
      },
      realtime: { enabled: true },
      storage: { provider: "s3" },
      cache: { provider: "redis" },
    }
    const result = appConfigSchema.safeParse(config)
    expect(result.success).toBe(true)
  })

  test("validates auth registration enum", () => {
    const result = appConfigSchema.safeParse({
      name: "test",
      models: { user: { fields: { email: { type: "string" } }, timestamps: false } },
      auth: { model: "user", registration: "invalid" },
    })
    expect(result.success).toBe(false)
  })

  test("applies database defaults", () => {
    const result = appConfigSchema.parse({
      name: "test",
      models: { item: { fields: { name: { type: "string" } }, timestamps: false } },
    })
    expect(result.database.provider).toBe("sqlite")
    expect(result.type).toBe("api")
  })

  test("validates model policies as strings", () => {
    const result = appConfigSchema.safeParse({
      name: "test",
      models: { item: { fields: { name: { type: "string" } }, timestamps: false, policies: { read: true } } },
    })
    expect(result.success).toBe(false)
  })
})
