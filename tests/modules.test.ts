import { describe, test, expect } from "bun:test"
import { registerJob, submitJob, getRegisteredJobs } from "../src/core/jobs"
import type { JobDefinition } from "../src/core/jobs"

function makeJob(name: string, fn?: any): JobDefinition {
  return { name, perform: fn || (async (a: any) => a) }
}

describe("jobs system", () => {
  test("register and check presence", () => {
    getRegisteredJobs().clear()
    registerJob(makeJob("test-job"))
    expect(getRegisteredJobs().has("test-job")).toBe(true)
  })

  test("duplicate key overwrites", () => {
    getRegisteredJobs().clear()
    registerJob(makeJob("dup-job"))
    registerJob(makeJob("dup-job"))
    expect(getRegisteredJobs().has("dup-job")).toBe(true)
  })

  test("submitJob adds to collection", async () => {
    const mockCol: any = { insert: (d: any) => ({ id: "jid-1" }) }
    registerJob(makeJob("submit-test"))
    const id = await submitJob(mockCol, "submit-test", { key: "val" })
    expect(id).toBeTruthy()
  })

  test("submitJob with delay options", async () => {
    const mockCol: any = { insert: (d: any) => ({ id: "jid-2" }) }
    registerJob(makeJob("delay-test"))
    const id = await submitJob(mockCol, "delay-test", { x: 1 }, { delay: 60, maxRetries: 3 })
    expect(id).toBeTruthy()
  })

  test("submitJob unknown returns falsy", async () => {
    getRegisteredJobs().clear()
    const mockCol: any = { insert: (d: any) => d }
    const id = await submitJob(mockCol, "unknown-job-xyz", {})
    expect(!id).toBe(true)
  })
})

describe("events system", () => {
  test("emit and on basic", async () => {
    const { emit, on } = await import("../src/core/events")
    const received: any[] = []
    const unsub = on("test-event", (data: any) => { received.push(data) })
    await emit("test-event", { msg: "hello" })
    expect(received.length).toBe(1)
    expect(received[0].msg).toBe("hello")
    unsub()
  })

  test("onAny catches all events", async () => {
    const { emit, onAny } = await import("../src/core/events")
    const received: any[] = []
    const unsub = onAny((event: string, data: any) => { received.push({ event, data }) })
    await emit("any-event-1", { n: 1 })
    await emit("any-event-2", { n: 2 })
    expect(received.length).toBe(2)
    unsub()
  })

  test("wildcard patterns", async () => {
    const { emit, on } = await import("../src/core/events")
    const received: any[] = []
    const unsub = on("posts.*", (data: any) => { received.push(data) })
    await emit("posts.created", { id: 1 })
    await emit("posts.updated", { id: 2 })
    await emit("comments.created", { id: 3 })
    expect(received.length).toBe(2)
    unsub()
  })

  test("priority ordering", async () => {
    const { emit, on } = await import("../src/core/events")
    const order: number[] = []
    const unsub1 = on("priority-test", () => { order.push(1) }, 10)
    const unsub2 = on("priority-test", () => { order.push(2) }, 20)
    await emit("priority-test", {})
    expect(order[0]).toBe(2) // higher priority first
    unsub1(); unsub2()
  })
})

describe("i18n", () => {
  test("init and translate", async () => {
    const { initI18n, t } = await import("../src/core/i18n")
    const rootDir = process.cwd() + "/tests"
    initI18n(rootDir, { defaultLocale: "en", locales: ["en"] })
    // Fallback: if no locale file, returns key
    const result = t("some.key")
    expect(result).toBe("some.key")
  })

  test("t with variables", async () => {
    const { t } = await import("../src/core/i18n")
    const result = t("welcome", { name: "World" })
    expect(typeof result).toBe("string")
  })
})

describe("search module", () => {
  test("createSearchProvider returns provider object", () => {
    const { createSearchProvider } = require("../src/core/search")
    const provider = createSearchProvider({ provider: "meilisearch" })
    expect(provider).toBeDefined()
  })
})
