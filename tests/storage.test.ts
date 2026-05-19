import { describe, test, expect } from "bun:test"
import { sanitizeFilename } from "../src/core/security"

describe("sanitizeFilename", () => {
  test("removes path traversal", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("etc_passwd")
  })

  test("removes null bytes", () => {
    expect(sanitizeFilename("file\x00.txt")).toBe("file.txt")
  })

  test("replaces special chars", () => {
    const result = sanitizeFilename("hello world!@#$.txt")
    expect(result).not.toContain("!")
    expect(result).toContain(".txt")
  })

  test("preserves simple names", () => {
    expect(sanitizeFilename("photo.jpg")).toBe("photo.jpg")
  })
})
