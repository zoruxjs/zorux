import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { diffModels, generateCreateTableSQL, generateAddColumnSQL, listMigrationFiles, createMigrationFile, generateMigrationContent } from "../src/core/migrate"
import { mkdtempSync, existsSync, readdirSync, readFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

describe("Model diff detection", () => {
  const oldModels = [
    { tableName: "posts", fields: [{ name: "title", type: "string", isRequired: true }] },
    { tableName: "comments", fields: [{ name: "content", type: "text" }] },
  ]

  test("detects created table", () => {
    const newModels = [
      { tableName: "posts", fields: [{ name: "title", type: "string" }] },
      { tableName: "comments", fields: [{ name: "content", type: "text" }] },
      { tableName: "tags", fields: [{ name: "name", type: "string" }] },
    ]
    const diffs = diffModels(oldModels, newModels)
    expect(diffs.find(d => d.tableName === "tags" && d.action === "create")).toBeDefined()
  })

  test("detects dropped table", () => {
    const newModels = [
      { tableName: "posts", fields: [{ name: "title", type: "string" }] },
    ]
    const diffs = diffModels(oldModels, newModels)
    expect(diffs.find(d => d.tableName === "comments" && d.action === "drop")).toBeDefined()
  })

  test("detects added column", () => {
    const newModels = [
      {
        tableName: "posts",
        fields: [
          { name: "title", type: "string" },
          { name: "body", type: "text", isRelation: false },
        ],
      },
      { tableName: "comments", fields: [{ name: "content", type: "text" }] },
    ]
    const diffs = diffModels(oldModels, newModels)
    const postDiff = diffs.find(d => d.tableName === "posts")
    expect(postDiff).toBeDefined()
    expect(postDiff!.added).toContain("body")
  })

  test("detects removed column", () => {
    const oldWithExtra = [
      {
        tableName: "posts",
        fields: [
          { name: "title", type: "string" },
          { name: "legacy", type: "string", isRelation: false },
        ],
      },
    ]
    const newWithoutExtra = [
      { tableName: "posts", fields: [{ name: "title", type: "string" }] },
    ]
    const diffs = diffModels(oldWithExtra, newWithoutExtra)
    const postDiff = diffs.find(d => d.tableName === "posts")
    expect(postDiff).toBeDefined()
    expect(postDiff!.removed).toContain("legacy")
  })

  test("no diff for identical models", () => {
    const diffs = diffModels(oldModels, oldModels)
    expect(diffs.length).toBe(0)
  })
})

describe("SQL generation", () => {
  test("generateCreateTableSQL produces valid SQL", () => {
    const model = {
      tableName: "users",
      idType: "int",
      hasAuth: true,
      softDelete: false,
      hasTimestamps: true,
      fields: [
        { name: "name", type: "string", isRequired: true, isUnique: false },
        { name: "email", type: "string", isRequired: true, isUnique: true },
        { name: "role", type: "string", isRequired: false, isUnique: false },
      ],
    }
    const sql = generateCreateTableSQL("sqlite", model)
    expect(sql).toContain("CREATE TABLE users")
    expect(sql).toContain("name TEXT NOT NULL")
    expect(sql).toContain("email TEXT NOT NULL UNIQUE")
    expect(sql).toContain("password TEXT NOT NULL")
    expect(sql).toContain("created_at TEXT DEFAULT CURRENT_TIMESTAMP")
    expect(sql).toContain("updated_at TEXT DEFAULT CURRENT_TIMESTAMP")
  })

  test("generateAddColumnSQL for various types", () => {
    const sql = generateAddColumnSQL("sqlite", "posts", { name: "views", type: "int", isRequired: false, isUnique: false })
    expect(sql).toContain("ALTER TABLE posts ADD COLUMN views INTEGER")
  })

  test("generateAddColumnSQL with NOT NULL", () => {
    const sql = generateAddColumnSQL("sqlite", "posts", { name: "slug", type: "string", isRequired: true, isUnique: true, defaultValue: "" })
    expect(sql).toContain("NOT NULL DEFAULT")
  })
})

describe("Migration file management", () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "Zorux-test-mig-"))
  })

  afterAll(() => {
    try { require("fs").rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  })

  test("createMigrationFile creates timestamped file", () => {
    const fileName = createMigrationFile(tmpDir, "test_create", "export async function up() {}")
    expect(fileName).toMatch(/^\d{14}-test_create\.ts$/)
    const filePath = join(tmpDir, "migrations", fileName)
    expect(existsSync(filePath)).toBe(true)
    const content = readFileSync(filePath, "utf-8")
    expect(content).toContain("export async function up()")
  })

  test("listMigrationFiles returns sorted files", () => {
    createMigrationFile(tmpDir, "zzz", "")
    createMigrationFile(tmpDir, "aaa", "")
    const files = listMigrationFiles(tmpDir)
    expect(files.length).toBeGreaterThanOrEqual(2)
    // Files should be sorted by timestamp (which is chronological order)
    for (let i = 1; i < files.length; i++) {
      expect(files[i].timestamp.localeCompare(files[i - 1].timestamp)).toBeGreaterThanOrEqual(0)
    }
  })

  test("generateMigrationContent creates up/down functions", () => {
    const content = generateMigrationContent(
      [{ tableName: "users", action: "create", added: [], removed: [], changed: [] }],
      "sqlite"
    )
    expect(content).toContain("export async function up")
    expect(content).toContain("export async function down")
    expect(content).toContain("DROP TABLE IF EXISTS users")
  })
})
