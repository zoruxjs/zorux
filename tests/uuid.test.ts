import { describe, test, expect } from "bun:test"
import { uuidv7 } from "../src/core/uuid"

describe("uuidv7", () => {
  test("generates a string", () => {
    const id = uuidv7()
    expect(typeof id).toBe("string")
  })

  test("generates unique IDs", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i++) ids.add(uuidv7())
    expect(ids.size).toBe(1000)
  })

  test("has correct format (36 chars, 4 hyphens)", () => {
    const id = uuidv7()
    expect(id.length).toBe(36)
    expect(id.split("-").length).toBe(5)
  })

  test("is time-ordered (first 12 chars = timestamp, should sort)", () => {
    const ids = Array.from({ length: 50 }, () => uuidv7())
    // First 12 chars before the hyphen are the timestamp portion
    const timestamps = ids.map(id => id.split("-")[0])
    const sorted = [...timestamps].sort()
    expect(timestamps).toEqual(sorted)
  })

  test("matches UUID v7 prefix pattern", () => {
    const id = uuidv7()
    // UUID v7: version bits at position 12-13 should be '7'
    expect(id[14]).toBe("7")
    // Variant bits at position 16-17 should be '8', '9', 'a', or 'b'
    expect("89ab".includes(id[19])).toBe(true)
  })

  test("no collisions in 10000 generations", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 10000; i++) ids.add(uuidv7())
    expect(ids.size).toBe(10000)
  })
})
