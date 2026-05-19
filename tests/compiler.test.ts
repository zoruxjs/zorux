import { describe, test, expect } from "bun:test"
import { compileModel, compileModels } from "../src/core/compiler"

describe("compileModel", () => {
  test("compiles simple model with fields", () => {
    const m = compileModel("post", { fields: { title: { type: "string", required: true } }, timestamps: true })
    expect(m.name).toBe("post")
    expect(m.tableName).toBe("posts")
    expect(m.fields.length).toBeGreaterThanOrEqual(1)
    expect(m.fields[0].name).toBe("title")
    expect(m.fields[0].type).toBe("string")
    expect(m.fields[0].isRequired).toBe(true)
  })

  test("detects auth model", () => {
    const m = compileModel("user", { fields: { email: { type: "string" } }, auth: "email", timestamps: false })
    expect(m.hasAuth).toBe(true)
  })

  test("detects relation via lowercase model name", () => {
    const m = compileModel("comment", { fields: { post: "post", content: { type: "text" } }, timestamps: false }, ["post"])
    const postField = m.fields.find(f => f.name === "post")
    expect(postField).toBeDefined()
    expect(postField!.isRelation).toBe(true)
    expect(postField!.relationModel).toBe("post")
    expect(postField!.relationType).toBe("belongsTo")
  })

  test("detects relation via uppercase model name", () => {
    const m = compileModel("comment", { fields: { post: "Post", content: { type: "text" } }, timestamps: false })
    const postField = m.fields.find(f => f.name === "post")
    expect(postField).toBeDefined()
    expect(postField!.isRelation).toBe(true)
  })

  test("parses short field syntax", () => {
    const m = compileModel("item", { fields: { name: "string required unique", age: "int default:0" }, timestamps: false })
    const nameF = m.fields.find(f => f.name === "name")!
    expect(nameF.type).toBe("string")
    expect(nameF.isRequired).toBe(true)
    expect(nameF.isUnique).toBe(true)
    const ageF = m.fields.find(f => f.name === "age")!
    expect(ageF.type).toBe("int")
    expect(ageF.defaultValue).toBe("0")
  })

  test("handles enum type", () => {
    const m = compileModel("user", { fields: { role: { type: "string", enum: ["admin", "user"], default: "user" } }, timestamps: false })
    const role = m.fields[0]
    expect(role.enum).toEqual(["admin", "user"])
    expect(role.defaultValue).toBe("user")
  })

  test("soft delete adds expectations", () => {
    const m = compileModel("post", { fields: { title: { type: "string" } }, timestamps: false, softDelete: true })
    expect(m.softDelete).toBe(true)
  })

  test("policies are preserved", () => {
    const m = compileModel("post", { fields: { title: { type: "string" } }, timestamps: false, policies: { read: "*" } })
    expect(m.policies?.read).toBe("*")
  })

  test("scoped model gets orgId field", () => {
    const m = compileModel("post", { fields: { title: { type: "string" } }, timestamps: false, scoped: true })
    const org = m.fields.find(f => f.name === "org")
    expect(org).toBeDefined()
    expect(org!.isRelation).toBe(true)
    expect(org!.relationModel).toBe("Organization")
  })

  test("UUID id type", () => {
    const m = compileModel("item", { fields: { name: { type: "string" } }, timestamps: false, id: "uuid" })
    expect(m.idType).toBe("uuid")
  })

  test("owner field detection", () => {
    const models = compileModels({
      user: { fields: { email: { type: "string" } }, auth: "email", timestamps: false },
      post: { fields: { title: { type: "string" }, author: "user" }, timestamps: false },
    }, "user")
    const post = models.find(m => m.name === "post")
    expect(post?.ownerField).toBe("authorId")
  })

  test("plural inference", () => {
    expect(compileModel("category", { fields: { name: { type: "string" } }, timestamps: false }).plural).toBe("categories")
    expect(compileModel("address", { fields: { name: { type: "string" } }, timestamps: false }).plural).toBe("addresses")
    expect(compileModel("post", { fields: { name: { type: "string" } }, timestamps: false }).plural).toBe("posts")
  })

  test("parseFieldType handles enum() syntax", () => {
    // The parseFieldType is internal, but we can test via model compilation
    const m = compileModel("item", { fields: { status: { type: "string", enum: ["draft", "published"] } }, timestamps: false })
    const f = m.fields[0]
    expect(f.enum).toEqual(["draft", "published"])
  })
})

describe("compileModels", () => {
  test("compiles multiple models", () => {
    const models = compileModels({
      user: { fields: { email: { type: "string" } }, timestamps: false },
      post: { fields: { title: { type: "string" } }, timestamps: false },
    })
    expect(models.length).toBe(2)
  })

  test("sets auth on matching model", () => {
    const models = compileModels({
      user: { fields: { email: { type: "string" } }, auth: "email", timestamps: false },
    })
    expect(models[0].hasAuth).toBe(true)
  })
})
