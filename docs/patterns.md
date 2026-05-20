# Patterns

Zorux provides official skeleton patterns for common custom code. These ensure consistency, proper error handling, and TypeScript safety when writing actions, jobs, and plugins.

Patterns are located at `.zorux/patterns/` in the project root.

## Action Pattern

File: `.zorux/patterns/action.ts`

Use this template when creating custom API actions.

```typescript
import { F } from "zorux"

interface ActionInput {
  // Define your input types here
}

export const handler = async (c: any): Promise<Response> => {
  try {
    const body: ActionInput = await c.req.json()

    // Validate input
    if (!body || Object.keys(body).length === 0) {
      return c.json({ success: false, error: "Input required" }, 400)
    }

    // Your logic here

    return c.json({ success: true, data: body })
  } catch (err: any) {
    console.error("[action] Error:", err.message)
    return c.json({ success: false, error: err.message }, 500)
  }
}
```

**Key conventions:**
- Always validate input before processing
- Always wrap in try/catch with error response
- Log errors for debugging
- Return consistent response shape: `{ success, data?, error? }`

## Job Pattern

File: `.zorux/patterns/job.ts`

Use this template for background jobs with retry support.

```typescript
export default {
  name: "my-job",
  description: "Describe what this job does",

  async perform(args: any): Promise<void> {
    const { /* destructure args */ } = args

    try {
      // Your job logic here
      console.log(`[job] Completed: ${JSON.stringify(args)}`)
    } catch (err: any) {
      console.error(`[job] Failed: ${err.message}`)
      throw err // Will trigger retry
    }
  },
}
```

**Key conventions:**
- Always include a descriptive `name` and `description`
- Throw errors to trigger retry (don't swallow them)
- Log start/end for observability

## Plugin Route Pattern

File: `.zorux/patterns/plugin-route.ts`

Use this template for custom routes via plugins.

```typescript
import { Hono } from "hono"

export default {
  name: "my-plugin",
  version: "1.0.0",
  description: "Describe your plugin",

  onRoutes(app: Hono) {
    // Public route example
    app.get("/api/public", (c) => {
      return c.json({ message: "Public endpoint" })
    })

    // Authenticated route example
    app.get("/api/protected", (c) => {
      const token = c.req.header("Authorization")
      if (!token) return c.json({ error: "Unauthorized" }, 401)
      return c.json({ message: "Protected data" })
    })

    // POST route with validation example
    app.post("/api/contact", async (c) => {
      try {
        const body = await c.req.json()
        if (!body.email) return c.json({ error: "Email required" }, 400)
        return c.json({ success: true })
      } catch (err: any) {
        return c.json({ error: err.message }, 500)
      }
    })
  },
}
```

**Key conventions:**
- Use `definePlugin()` from `zorux/plugin` when possible
- Document which routes are public vs authenticated
- Validate input on POST/PUT routes
- Handle errors consistently

## Best Practices

1. **Copy, don't write from scratch** — use `.zorux/patterns/` as a starting point
2. **Keep files small** — split large actions/jobs into separate files
3. **Always validate input** — never trust external data
4. **Always handle errors** — never use empty `catch {}`
5. **Use types over `any`** — define interfaces for your data shapes
6. **Add tests** — run `zorux test` after creating custom code
7. **Use `zorux make`** — `zorux make action`, `zorux make job` generate skeleton files automatically
