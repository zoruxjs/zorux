# Realtime

Zorux supports realtime updates via WebSocket (Zorux provider) or PostgreSQL CDC (supabase provider).

## Configuration

```yaml
realtime:
  enabled: true
```

## Events

Events are published automatically on CRUD operations:

```
{model}:created   # After POST
{model}:updated   # After PUT
{model}:deleted   # After DELETE
```

## WebSocket (Zorux provider)

Connect to `ws://localhost:3000/ws` and subscribe:

```js
const ws = new WebSocket("ws://localhost:3000/ws")

ws.onopen = () => {
  ws.send(JSON.stringify({ subscribe: "posts:created" }))
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  console.log(msg.topic, msg.data)  // "posts:created" { id, title, ... }
}
```

### Admin Auto-Refresh

When `realtime: enabled`, the admin dashboard and list pages automatically reload when data changes, via an inline WebSocket client.

## Supabase Realtime

With `provider: supabase`, realtime uses PostgreSQL's built-in change data capture (CDC). Subscribe to changes on any table:

```ts
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(url, key)
const channel = supabase.channel("posts")
channel.on("postgres_changes",
  { event: "*", schema: "public", table: "posts" },
  (payload) => console.log(payload)
)
channel.subscribe()
```

## Mobile

The mobile app includes a `useRealtime` hook:

```ts
import { useRealtime } from "../api/realtime"

useRealtime("posts:created", (data) => {
  // Refresh list
})
```
