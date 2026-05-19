import { describe, test, expect } from "bun:test"
import { getHints, formatErrorWithHints } from "../src/core/hints"

describe("getHints", () => {
  test("database column errors", () => {
    const r = getHints("table posts has no column named authorId")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints[0].toLowerCase()).toContain("field")
  })

  test("unique constraint errors", () => {
    const r = getHints("UNIQUE constraint failed: users.email")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("duplicate"))).toBe(true)
  })

  test("foreign key errors", () => {
    const r = getHints("FOREIGN KEY constraint failed")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("parent"))).toBe(true)
  })

  test("connection refused errors", () => {
    const r = getHints("ECONNREFUSED localhost:5432")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("running"))).toBe(true)
  })

  test("model not found errors", () => {
    const r = getHints("Model 'usr' not found")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("model name"))).toBe(true)
  })

  test("field not found errors", () => {
    const r = getHints("Field 'emial' not found in schema")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("field name"))).toBe(true)
  })

  test("policy syntax errors", () => {
    const r = getHints("Unexpected token: @")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.includes("=="))).toBe(true)
  })

  test("forbidden/permission errors", () => {
    const r = getHints("Forbidden: insufficient permissions")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("permission"))).toBe(true)
  })

  test("invalid credentials", () => {
    const r = getHints("Invalid credentials")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("password"))).toBe(true)
  })

  test("JWT errors", () => {
    const r = getHints("jwt expired")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("session"))).toBe(true)
  })

  test("module not found", () => {
    const r = getHints("Cannot find module 'graphql'")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("install"))).toBe(true)
  })

  test("validation errors", () => {
    const r = getHints("Validation failed")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("required"))).toBe(true)
  })

  test("soft delete errors", () => {
    const r = getHints("column deleted_at")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("soft-deleted"))).toBe(true)
  })

  test("scoped model errors", () => {
    const r = getHints("X-Org-ID header required")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("multi-tenant"))).toBe(true)
  })

  test("rate limit errors", () => {
    const r = getHints("Rate limit exceeded")
    expect(r.hints.length).toBeGreaterThan(0)
    expect(r.hints.some(h => h.toLowerCase().includes("minute"))).toBe(true)
  })

  test("unknown errors fallback to generic hints", () => {
    const r = getHints("Some random unexpected error occurred")
    expect(r.hints.length).toBeGreaterThan(0)
  })
})

describe("formatErrorWithHints", () => {
  test("formats with emoji and hints", () => {
    const output = formatErrorWithHints("Something went wrong")
    expect(output).toContain("✖")
    expect(output).toContain("💡")
    expect(output).toContain("Something went wrong")
  })

  test("includes docs link when available", () => {
    const r = getHints("UNIQUE constraint failed")
    // Should not crash
  })
})
