# Real-time

Zorux includes a WebSocket server with pub/sub engine, auto-publish on CRUD, and Turbo-style SPA navigation with live refresh.

## Configuration

```yaml
realtime:
  enabled: true
  channels:
    posts: "posts.*"
    comments: "comments.*"
```

## WebSocket Server

### Connection

```
ws://localhost:3000/ws
```

### Client Protocol

**Subscribe to a topic:**

```json
{ "subscribe": "posts" }
```

**Unsubscribe:**

```json
{ "unsubscribe": "posts" }
```

**Receive events:**

```json
{
  "topic": "posts:created",
  "data": {
    "id": 1,
    "title": "Hello World",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

### JavaScript Client

```javascript
const ws = new WebSocket("ws://localhost:3000/ws")

ws.onopen = () => {
  // Subscribe to topics
  ws.send(JSON.stringify({ subscribe: "posts" }))
  ws.send(JSON.stringify({ subscribe: "comments" }))
}

ws.onmessage = (event) => {
  const { topic, data } = JSON.parse(event.data)
  console.log(topic, data)
}
```

## Pub/Sub Engine

### Subscribe

```typescript
import { subscribe } from "zorux/realtime"

const unsubscribe = subscribe("posts", (data) => {
  console.log("New post:", data)
})

// Later: unsubscribe()
```

### Publish

```typescript
import { publish, publishMany } from "zorux/realtime"

// Publish to a single topic
publish("posts:created", { id: 1, title: "Hello" })

// Publish to multiple topics
publishMany(["posts", "notifications"], { id: 1, title: "Hello" })
```

## Auto-Publish on CRUD

Every CRUD operation automatically publishes events:

| Operation | Event Topic |
|---|---|
| Create | `{tableName}:created` |
| Update | `{tableName}:updated` |
| Delete | `{tableName}:deleted` |
| Restore (soft delete) | `{tableName}:restored` |

### Example

When a post is created:

```json
{
  "topic": "posts:created",
  "data": {
    "id": 1,
    "title": "Hello World",
    "body": "Content",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

All clients subscribed to `posts` receive this event.

## Turbo-Style SPA Navigation

The admin UI uses `/static/turbo.js` for SPA navigation with WebSocket refresh:

1. **Click link** — Intercepts navigation
2. **Fetch page** — AJAX request to server
3. **Replace body** — Swaps content without full reload
4. **WebSocket refresh** — Server pushes update, page auto-refreshes

### Form Interception

Forms are intercepted and submitted via AJAX:

```html
<form action="/api/posts" method="POST" data-turbo="true">
  <input name="title" />
  <button type="submit">Create</button>
</form>
```

On success, the page navigates to the list view automatically.

## Notifications

User notifications are stored in the `_notifications` table and pushed via WebSocket.

### API

```bash
# List notifications
GET /api/notifications
Authorization: Bearer <token>

# Mark as read
PUT /api/notifications/:id/read
Authorization: Bearer <token>

# Mark all as read
POST /api/notifications/read-all
Authorization: Bearer <token>
```

### Real-time Notifications

When a notification is created, it's pushed to the user's WebSocket connection:

```json
{
  "topic": "notifications",
  "data": {
    "id": 1,
    "message": "New comment on your post",
    "read": false,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

## Admin UI Integration

The admin dashboard shows:
- **Notification bell** — Unread count with dropdown
- **Live updates** — Dashboard stats refresh via WebSocket
- **Activity feed** — Recent activity updates in real-time

## Channels Configuration

Define channels in `app.yaml`:

```yaml
realtime:
  enabled: true
  channels:
    posts: "posts.*"
    comments: "comments.*"
    users: "users.*"
```

Channels map to topic patterns for subscription management.

## Custom Events

Publish custom events from actions:

```typescript
// actions/posts.ts
export const publish_post = F.auth(async (ctx) => {
  const { id } = await ctx.req.json()

  // Update post status
  await db.collection("posts").update(id, { status: "published" })

  // Publish custom event
  publish("posts:published", { id, status: "published" })

  return F.json({ published: true })
})
```

## WebSocket Server Details

### Bun Native WebSocket

Uses Bun's native WebSocket support via `Bun.serve()`:

```typescript
Bun.serve({
  fetch: app.fetch,
  websocket: {
    message(ws, message) { ... },
    open(ws) { ... },
    close(ws) { ... }
  }
})
```

### Connection Management

- Each connection is tracked internally
- Subscriptions are per-connection
- Connections are cleaned up on disconnect
- No external dependencies (no Socket.io, no ws package)
