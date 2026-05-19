# Webhooks

Zorux automatically fires webhooks on CRUD operations with HMAC-SHA256 signed payloads, retry logic, and per-model event filtering.

## Configuration

Webhooks are registered via the API and stored in the `_webhooks` table.

## Registering Webhooks

### Create Webhook

```bash
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://myapp.com/webhook",
  "events": "posts.created,posts.updated,comments.created",
  "secret": "my-webhook-secret"
}
```

**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | Webhook endpoint URL |
| `events` | string | Yes | Comma-separated events, or `*` for all |
| `secret` | string | Yes | HMAC signing secret |
| `active` | boolean | No | Enable/disable (default: true) |
| `userId` | number | No | Owner user ID |

### Events Format

| Value | Description |
|---|---|
| `*` | All events on all models |
| `posts.*` | All events on posts |
| `posts.created` | Only post creation |
| `posts.created,posts.updated` | Multiple specific events |

### List Webhooks

```bash
GET /api/webhooks
Authorization: Bearer <token>
```

### Update Webhook

```bash
PUT /api/webhooks/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "url": "https://new-url.com/webhook", "active": false }
```

### Delete Webhook

```bash
DELETE /api/webhooks/:id
Authorization: Bearer <token>
```

## Webhook Payload

When an event fires, the payload is:

```json
{
  "event": "posts:created",
  "model": "posts",
  "data": {
    "id": 1,
    "title": "Hello World",
    "body": "Content",
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## HMAC Signing

Each webhook request is signed with HMAC-SHA256:

### Signature Calculation

```
signature = HMAC-SHA256(JSON.stringify(payload) + secret)
```

### Request Headers

```
Content-Type: application/json
X-Webhook-Signature: sha256=abc123...
X-Webhook-Event: posts:created
User-Agent: Zorux-Webhook/1.0
```

### Verifying Signatures

**Node.js:**

```javascript
import crypto from "crypto"

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload) + secret)
    .digest("hex")

  return `sha256=${expected}` === signature
}
```

**Python:**

```python
import hmac
import hashlib
import json

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        (json.dumps(payload) + secret).encode(),
        hashlib.sha256
    ).hexdigest()
    return f"sha256={expected}" == signature
```

## Auto-Fire Events

Webhooks fire automatically on CRUD operations:

| Operation | Event |
|---|---|
| Create | `{model}:created` |
| Update | `{model}:updated` |
| Delete | `{model}:deleted` |
| Restore | `{model}:restored` |

### Fire-and-Forget

Webhooks are delivered asynchronously with `Promise.allSettled()`. Failed deliveries don't block the API response.

### Timeout

Each webhook delivery has a 10-second timeout.

## Retry Logic

Failed webhook deliveries are retried:

| Attempt | Delay |
|---|---|
| 1 | Immediate |
| 2 | 5 seconds |
| 3 | 10 seconds |
| 4 | 20 seconds |
| 5 | 40 seconds |

## Webhook Database Table

```sql
CREATE TABLE _webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  secret TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Example: Receiving Webhooks

### Express

```javascript
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-webhook-signature"]
  const event = req.headers["x-webhook-event"]

  if (!verifyWebhook(req.body, signature, "my-secret")) {
    return res.status(401).send("Invalid signature")
  }

  console.log(`Received ${event}:`, req.body.data)
  res.status(200).send("OK")
})
```

### Hono

```typescript
app.post("/webhook", async (c) => {
  const body = await c.req.json()
  const signature = c.req.header("x-webhook-signature")

  if (!verifyWebhook(body, signature, "my-secret")) {
    return c.text("Invalid signature", 401)
  }

  const event = c.req.header("x-webhook-event")
  console.log(`Received ${event}:`, body.data)

  return c.text("OK")
})
```

## Use Cases

### External Integrations

- Notify Slack on new orders
- Update CRM on new leads
- Trigger CI/CD on content changes

### Microservices

- Sync data between services
- Event-driven architecture
- Decouple services via webhooks

### Third-party APIs

- Send data to analytics platforms
- Trigger external workflows
- Sync with external databases
