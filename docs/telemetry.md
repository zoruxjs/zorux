# Telemetry & Metrics

<!-- maturity: 🔬 Experimental -->
> **🔬 Experimental** — This feature is in early development — not recommended for production


Zorux includes built-in telemetry with Prometheus-format metrics, OTLP tracing, and HTTP request monitoring.

## Configuration

Telemetry is enabled by default. Configure exporters via environment variables.

## Metrics

### Counter

Increment-only metric for tracking totals.

```typescript
import { Counter } from "zorux/telemetry"

const requests = new Counter("http_requests_total", "Total HTTP requests")

requests.add(1, { method: "GET", path: "/api/posts" })
requests.add(1, { method: "POST", path: "/api/posts" })
```

**Methods:**

| Method | Description |
|---|---|
| `add(value, labels?)` | Increment counter |
| `snapshot()` | Get current values |
| `reset()` | Reset to zero |

### Histogram

Tracks value distribution with percentiles.

```typescript
import { Histogram } from "zorux/telemetry"

const duration = new Histogram("http_request_duration_ms", "Request duration")

duration.record(45)
duration.record(120)
duration.record(8)
```

**Methods:**

| Method | Description |
|---|---|
| `record(value)` | Record a value |
| `snapshot()` | Get stats (count, sum, min, max, avg, p50, p95, p99) |

### Snapshot Output

```json
{
  "count": 1000,
  "sum": 45000,
  "min": 2,
  "max": 500,
  "avg": 45,
  "p50": 35,
  "p95": 120,
  "p99": 250
}
```

## Tracing

### Span

A span represents a single operation in a trace.

```typescript
import { startSpan, endSpan, addSpanEvent } from "zorux/telemetry"

const span = startSpan("process-payment", { orderId: "123" })

try {
  // Do work
  addSpanEvent(span, "payment-initiated", { provider: "stripe" })
  await processPayment()
  addSpanEvent(span, "payment-completed")
  endSpan(span, "ok")
} catch (error) {
  endSpan(span, "error", error.message)
}
```

**Span Properties:**

| Property | Type | Description |
|---|---|---|
| `name` | string | Operation name |
| `traceId` | string | Trace identifier |
| `spanId` | string | Span identifier |
| `parentSpanId` | string? | Parent span (for nested traces) |
| `startTime` | number | Start timestamp |
| `endTime` | number? | End timestamp |
| `attributes` | object | Key-value attributes |
| `events` | array[] | Timeline events |
| `status` | string? | `ok` or `error` |

## Exporters

### Console Exporter

Logs spans to stdout.

```typescript
import { ConsoleExporter } from "zorux/telemetry"

const exporter = new ConsoleExporter()
```

**Output:**

```
[TRACE] process-payment (trace-123, span-456)
  Status: ok
  Duration: 45ms
  Attributes: { orderId: "123" }
  Events:
    - payment-initiated { provider: "stripe" }
    - payment-completed
```

### OTLP Exporter

Sends traces to an OTLP-compatible backend (Jaeger, Tempo, etc.).

```typescript
import { OTLPExporter } from "zorux/telemetry"

const exporter = new OTLPExporter({
  endpoint: process.env.OTLP_ENDPOINT || "http://localhost:4318/v1/traces"
})
```

**Environment Variable:** `OTLP_ENDPOINT`

## Telemetry Middleware

Automatically traces every HTTP request.

```typescript
import { telemetryMiddleware } from "zorux/telemetry"

app.use("*", telemetryMiddleware(exporter))
```

**Auto-recorded:**

- HTTP method
- Request path
- Response status code
- Request duration

## Metrics Endpoint

```
GET /api/metrics
```

Returns metrics in Prometheus text format:

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/posts"} 1523
http_requests_total{method="POST",path="/api/posts"} 342

# HELP http_request_duration_ms Request duration
# TYPE http_request_duration_ms histogram
http_request_duration_ms_count 1865
http_request_duration_ms_sum 83925
http_request_duration_ms_bucket{le="10"} 234
http_request_duration_ms_bucket{le="50"} 1200
http_request_duration_ms_bucket{le="100"} 1600
http_request_duration_ms_bucket{le="500"} 1850
http_request_duration_ms_bucket{le="+Inf"} 1865
```

## Admin Monitor

The admin monitor page (`/admin/monitor`) displays:

- **Request count** — Total requests served
- **Average duration** — Mean response time
- **P95 duration** — 95th percentile response time
- **Error rate** — Percentage of 5xx responses
- **Uptime** — Server runtime
- **Memory usage** — Heap statistics

## Integration with Prometheus

Scrape the metrics endpoint:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "zorux"
    metrics_path: "/api/metrics"
    static_configs:
      - targets: ["localhost:3000"]
```

## Integration with Jaeger

Send traces to Jaeger:

```bash
export OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Jaeger UI: `http://localhost:16686`

## Integration with Grafana

Use the Prometheus data source to create dashboards:

- Request rate (req/s)
- Response duration (p50, p95, p99)
- Error rate (%)
- Cache hit ratio
- Job queue depth

## Custom Metrics

Track application-specific metrics:

```typescript
import { Counter, Histogram } from "zorux/telemetry"

const userSignups = new Counter("user_signups_total", "Total user signups")
const emailSendDuration = new Histogram("email_send_duration_ms", "Email send duration")

// In your action
userSignups.add(1)

// In your job
const start = Date.now()
await sendEmail(args)
emailSendDuration.record(Date.now() - start)
```
