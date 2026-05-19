# Background Jobs

## Defining Jobs

Create a file in `jobs/` directory:

```ts
// jobs/greet.ts
export default {
  name: "greet",
  async perform(args: { name: string }) {
    console.log("Hello, " + args.name + "!")
  },
}
```

## Submitting Jobs

### Via API

```bash
# Immediate
POST /api/jobs/greet/submit
{ "args": { "name": "World" } }

# Delayed (60 seconds)
POST /api/jobs/greet/submit
{ "args": { "name": "World" }, "delay": 60 }
```

### Via Code

```ts
import { submitJob } from "Zorux/jobs"

// Immediate
await submitJob(adapter, "greet", { name: "World" })

// Delayed
await submitJob(adapter, "greet", { name: "World" }, { delay: 60 })
```

## Features

- **Persistent**: stored in `_Zorux_jobs` table/collection
- **Retry**: exponential backoff (5s, 10s, 20s...) up to 3 retries
- **Delay**: schedule jobs for future execution
- **Worker**: polling every 1s
- **Multi-DB**: SQLite, PostgreSQL, MySQL, MongoDB, Supabase

## In Actions

```ts
// actions/posts.ts
export const create = {
  policy: "authenticated",
  handler: async (c) => {
    const body = await c.req.json()
    const created = await col.insert(body)
    await submitJob(adapter, "send-welcome", { email: body.email })
    return c.json(created, 201)
  },
}
```
