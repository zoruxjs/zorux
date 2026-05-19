import { describe, test, expect, beforeAll } from "bun:test"
import { createAdapter } from "../src/core/db"

describe("DB adapter SQLite", () => {
  let adapter: any

  beforeAll(async () => {
    adapter = createAdapter("sqlite", ":memory:")
    await adapter.connect()
  })

  test("run and get", () => {
    adapter.run("CREATE TABLE IF NOT EXISTS _test (id INTEGER PRIMARY KEY, name TEXT)")
    adapter.run("INSERT INTO _test (name) VALUES (?)", ["hello"])
    const row = adapter.get("SELECT * FROM _test WHERE id = ?", [1])
    expect(row).toBeTruthy()
    expect(row.name).toBe("hello")
  })

  test("all returns array", () => {
    adapter.run("INSERT INTO _test (name) VALUES (?)", ["world"])
    const rows = adapter.all("SELECT * FROM _test ORDER BY id")
    expect(rows.length).toBeGreaterThanOrEqual(2)
  })

  test("missing get returns null", () => {
    const row = adapter.get("SELECT * FROM _test WHERE id = ?", [999])
    expect(row).toBeNull()
  })

  test("collection CRUD", () => {
    const model: any = {
      tableName: "_test_crud",
      fields: [{ name: "name", type: "string", isRequired: true, isUnique: false }],
    }
    adapter.run("CREATE TABLE IF NOT EXISTS _test_crud (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)")
    const col = adapter.collection("_test_crud", model)

    const created = col.insert({ name: "crud test" })
    expect(created).toBeTruthy()
    expect(created.name).toBe("crud test")
    expect(created.id).toBeTruthy()

    const found = col.findById(created.id)
    expect(found).toBeTruthy()
    expect(found.name).toBe("crud test")

    col.update(created.id, { name: "updated" })
    const updated = col.findById(created.id)
    expect(updated.name).toBe("updated")

    const byField = col.findBy("name", "updated")
    expect(byField).toBeTruthy()

    const count = col.count()
    expect(count).toBeGreaterThanOrEqual(1)

    col.deleteById(created.id)
    expect(col.findById(created.id)).toBeNull()
  })

  test("search with term", () => {
    const model: any = {
      tableName: "_test_search",
      fields: [
        { name: "title", type: "string", isRequired: false, isUnique: false },
        { name: "body", type: "text", isRequired: false, isUnique: false },
      ],
    }
    adapter.run("CREATE TABLE IF NOT EXISTS _test_search (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT)")
    adapter.run("INSERT INTO _test_search (title, body) VALUES (?, ?)", ["hello world", "some body"])
    adapter.run("INSERT INTO _test_search (title, body) VALUES (?, ?)", ["goodbye world", "other body"])
    const col = adapter.collection("_test_search", model)
    const { rows, total } = col.search(["title", "body"], "hello", "id", "ASC", 10, 0)
    expect(rows.length).toBe(1)
    expect(total).toBeGreaterThanOrEqual(1)
  })

  test("find with sort and limit", () => {
    const col = adapter.collection("_test_search", { tableName: "_test_search", fields: [] })
    const results = col.find("id", "DESC", 2, 0)
    expect(results.length).toBe(2)
  })
})
