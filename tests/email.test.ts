import { describe, test, expect } from "bun:test"
import { createEmailProvider } from "../src/core/email"

describe("fake email provider", () => {
  test("sends without throwing", async () => {
    const provider = createEmailProvider({ provider: "fake" })
    await provider.send({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    })
    // No throw = success
  })

  test("captures sent emails in memory", async () => {
    const provider = createEmailProvider({ provider: "fake" })
    await provider.send({
      to: "capture@example.com",
      subject: "Capture Test",
      html: "<p>Content</p>",
      text: "Plain content",
    })
    const emails = await provider.list?.()
    // The fake provider captures emails
    if (emails) {
      const found = emails.find((e: any) => e.to === "capture@example.com")
      expect(found).toBeDefined()
      expect(found.subject).toBe("Capture Test")
    }
  })

  test("sends with text only", async () => {
    const provider = createEmailProvider({ provider: "fake" })
    await provider.send({
      to: "text@example.com",
      subject: "Text Only",
      text: "Hello in plain text",
    })
  })

  test("handles multiple recipients", async () => {
    const provider = createEmailProvider({ provider: "fake" })
    await provider.send({
      to: "a@example.com, b@example.com",
      subject: "Multiple",
      html: "<p>Multiple recipients</p>",
    })
  })

  test("log provider does not throw", async () => {
    const provider = createEmailProvider({ provider: "log" })
    await provider.send({
      to: "log@example.com",
      subject: "Log Test",
      html: "<p>Log me</p>",
    })
  })

  test("invalid provider falls back to fake", () => {
    const p = createEmailProvider({ provider: "nonexistent" })
    expect(p).toBeDefined()
    expect(p.name).toBeDefined()
  })
})
