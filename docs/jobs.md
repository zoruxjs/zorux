# Background Jobs

Zorux includes a persistent background job system with retry, delayed scheduling, and multiple queue backends.

## Configuration

Jobs are defined in `jobs/*.ts` files and auto-loaded on startup.

```yaml
# app.yaml — no config needed for basic jobs
# Jobs use the same database as your app
```

## Job Definition

```typescript
// jobs/send-welcome-email.ts
export default {
  name: "send-welcome-email",
  async perform(args: { email: string; name: string }, context: any) {
    await sendEmail({
      to: args.email,
      subject: "Welcome!",
      html: `<h1>Hi ${args.name}!</h1>`
    })
  }
}
```

### Job Interface

```typescript
interface JobDefinition {
  name: string
  perform: (args: any, context: any) => any | Promise<any>
}
```

## Submitting Jobs

### Via API

```bash
POST /api/jobs/send-welcome-email/submit
Content-Type: application/json

{
  "args": { "email": "user@example.com", "name": "John" },
  "delay": 3600,
  "maxRetries": 5
}
```

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `args` | object | `{}` | Arguments passed to `perform()` |
| `delay` | number | 0 | Seconds to wait before executing |
| `maxRetries` | number | 3 | Maximum retry attempts |

### Via Code

```typescript
import { submitJob } from "zorux/jobs"

const jobId = await submitJob(db.collection("_kai_jobs"), "send-welcome-email", {
  email: "user@example.com",
  name: "John"
}, {
  delay: 3600,      // Run in 1 hour
  maxRetries: 5     // Retry up to 5 times
})
```

## Job Statuses

| Status | Description |
|---|---|
| `pending` | Waiting to be processed |
| `running` | Currently being executed |
| `completed` | Successfully finished |
| `failed` | Failed after max retries |

## Retry Logic

Jobs that fail are automatically retried with exponential backoff:

```
Retry 1: 5 seconds
Retry 2: 10 seconds
Retry 3: 20 seconds
Retry 4: 40 seconds
Retry 5: 80 seconds
```

Formula: `delay = 5 * 2^retries` seconds

### Custom Retry

```bash
POST /api/jobs/my-job/submit
{
  "args": { ... },
  "maxRetries": 10
}
```

## Delayed Scheduling

Run a job at a specific time:

```bash
POST /api/jobs/send-reminder/submit
{
  "args": { "userId": 1 },
  "delay": 86400    // Run in 24 hours
}
```

## Worker

The job worker runs automatically when jobs are defined:

- **Polling interval:** 1000ms (configurable)
- **Batch size:** Up to 10 pending jobs per tick
- **Auto-starts:** On server startup

### Worker Configuration

```yaml
# Environment variable
JOBS_POLL_INTERVAL=2000    # Poll every 2 seconds
```

## Cloudflare Queues

For Cloudflare Workers deployments, jobs use Cloudflare Queues:

```yaml
database:
  provider: cloudflare-d1
```

Jobs are submitted to Cloudflare Queues and processed by the Workers runtime.

## MongoDB Jobs

For MongoDB, jobs are stored in a `_kai_jobs` collection instead of a table.

## Job Database Table

```sql
CREATE TABLE _kai_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  args TEXT,                  -- JSON-encoded arguments
  status TEXT DEFAULT 'pending',
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at DATETIME,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Error Handling

Failed jobs store the error message:

```json
{
  "id": 1,
  "name": "send-welcome-email",
  "status": "failed",
  "retries": 3,
  "error": "SMTP connection refused",
  "args": { "email": "user@example.com" }
}
```

## Monitoring

Job counts are visible in the admin monitor page (`/admin/monitor`):

- Pending jobs
- Running jobs
- Completed jobs
- Failed jobs

## Examples

### Email Queue

```typescript
// jobs/send-email.ts
export default {
  name: "send-email",
  async perform(args: { to: string; subject: string; html: string }) {
    await sendEmail(args)
  }
}
```

```typescript
// In an action
await submitJob(db.collection("_kai_jobs"), "send-email", {
  to: "user@example.com",
  subject: "Hello",
  html: "<p>Hi!</p>"
})
```

### Data Processing

```typescript
// jobs/process-upload.ts
export default {
  name: "process-upload",
  async perform(args: { fileId: string }) {
    const file = await getFile(args.fileId)
    const data = await parseCSV(file)
    await bulkImport("products", data)
  }
}
```

### Scheduled Report

```typescript
// jobs/weekly-report.ts
export default {
  name: "weekly-report",
  async perform() {
    const users = await db.collection("users").find()
    const report = generateReport(users)
    await sendEmail({
      to: "admin@myapp.com",
      subject: "Weekly Report",
      html: report
    })
  }
}
```

Submit with delay for weekly execution:

```typescript
await submitJob(db.collection("_kai_jobs"), "weekly-report", {}, {
  delay: 7 * 24 * 3600  // 7 days
})
```
