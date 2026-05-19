// ═══════════════════════════════════════════════════
// Metrics
// ═══════════════════════════════════════════════════

interface MetricPoint {
  value: number
  timestamp: number
  labels: Record<string, string>
}

class Counter {
  private points: MetricPoint[] = []

  constructor(public name: string, public description: string) {}

  add(value = 1, labels: Record<string, string> = {}) {
    this.points.push({ value, timestamp: Date.now(), labels })
  }

  snapshot(): { total: number; points: MetricPoint[] } {
    return {
      total: this.points.reduce((s, p) => s + p.value, 0),
      points: [...this.points],
    }
  }

  reset() { this.points = [] }
}

class Histogram {
  private values: number[] = []

  constructor(public name: string, public description: string) {}

  record(value: number) {
    this.values.push(value)
  }

  snapshot(): { count: number; sum: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number } {
    const sorted = [...this.values].sort((a, b) => a - b)
    const count = sorted.length
    if (count === 0) return { count: 0, sum: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 }
    const sum = sorted.reduce((s, v) => s + v, 0)
    return {
      count,
      sum,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sum / count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    }
  }

  reset() { this.values = [] }
}

// ═══════════════════════════════════════════════════
// Tracer (lightweight, zero-dep)
// ═══════════════════════════════════════════════════

export interface Span {
  name: string
  traceId: string
  spanId: string
  parentSpanId?: string
  startTime: number
  endTime?: number
  attributes: Record<string, any>
  events: { name: string; timestamp: number; attributes?: Record<string, any> }[]
  status?: { code: number; message?: string }
}

function generateId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
}

export function startSpan(name: string, attributes: Record<string, any> = {}, traceId?: string): Span {
  const tid = traceId || generateId() + generateId()
  return {
    name,
    traceId: tid,
    spanId: generateId(),
    startTime: performance.now(),
    attributes,
    events: [],
  }
}

export function endSpan(span: Span, status?: { code: number; message?: string }) {
  span.endTime = performance.now()
  if (status) span.status = status
}

export function addSpanEvent(span: Span, name: string, attributes?: Record<string, any>) {
  span.events.push({ name, timestamp: performance.now(), attributes })
}

export function setSpanAttribute(span: Span, key: string, value: any) {
  span.attributes[key] = value
}

// ═══════════════════════════════════════════════════
// Exporters
// ═══════════════════════════════════════════════════

interface Exporter {
  name: string
  export(traceId: string, spans: Span[]): Promise<void>
  exportMetrics?(counters: Counter[], histograms: Histogram[]): Promise<void>
}

class ConsoleExporter implements Exporter {
  name = "console"

  async export(traceId: string, spans: Span[]): Promise<void> {
    for (const span of spans) {
      const duration = span.endTime ? (span.endTime - span.startTime).toFixed(2) : "running"
      console.log(
        `  [trace] ${span.traceId.slice(0, 8)} ${span.name} ${duration}ms` +
        (span.status ? ` status=${span.status.code}` : "") +
        (span.attributes?.method ? ` ${span.attributes.method} ${span.attributes.path}` : "")
      )
    }
  }

  async exportMetrics(counters: Counter[], histograms: Histogram[]): Promise<void> {
    for (const c of counters) {
      const snap = c.snapshot()
      console.log(`  [metric] ${c.name} total=${snap.total}`)
    }
    for (const h of histograms) {
      const snap = h.snapshot()
      if (snap.count > 0) {
        console.log(`  [metric] ${h.name} count=${snap.count} avg=${snap.avg.toFixed(1)}ms p95=${snap.p95.toFixed(1)}ms`)
      }
    }
  }
}

class OTLPExporter implements Exporter {
  name = "otlp"
  private endpoint: string

  constructor(endpoint?: string) {
    this.endpoint = endpoint || process.env.OTLP_ENDPOINT || "http://localhost:4318/v1/traces"
  }

  async export(traceId: string, spans: Span[]): Promise<void> {
    try {
      const body = {
        resourceSpans: [{
          resource: { attributes: [{ key: "service.name", value: { stringValue: process.env.APP_NAME || "Zorux-app" } }] },
          scopeSpans: [{
            scope: { name: "Zorux" },
            spans: spans.map(s => ({
              traceId,
              spanId: s.spanId,
              parentSpanId: s.parentSpanId,
              name: s.name,
              startTimeUnixNano: BigInt(Math.floor(s.startTime * 1_000_000)).toString(),
              endTimeUnixNano: s.endTime ? BigInt(Math.floor(s.endTime * 1_000_000)).toString() : "0",
              attributes: Object.entries(s.attributes).map(([k, v]) => ({
                key: k,
                value: { stringValue: String(v) },
              })),
              status: s.status,
            })),
          }],
        }],
      }
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    } catch {}
  }
}

// ═══════════════════════════════════════════════════
// Metrics registry
// ═══════════════════════════════════════════════════

const counters: Counter[] = []
const histograms: Histogram[] = []

function getCounter(name: string, description: string): Counter {
  let c = counters.find(c => c.name === name)
  if (!c) { c = new Counter(name, description); counters.push(c) }
  return c
}

function getHistogram(name: string, description: string): Histogram {
  let h = histograms.find(h => h.name === name)
  if (!h) { h = new Histogram(name, description); histograms.push(h) }
  return h
}

// ═══════════════════════════════════════════════════
// Request middleware
// ═══════════════════════════════════════════════════

export function telemetryMiddleware(exporter?: Exporter) {
  const exp = exporter || new ConsoleExporter()

  return async (c: any, next: any) => {
    const span = startSpan("http.request", {
      method: c.req.method,
      path: c.req.path || c.req.url,
      host: c.req.header("host") || "",
    })

    getCounter("http.requests.total", "Total HTTP requests").add(1, { method: c.req.method })
    const startTime = performance.now()

    try {
      await next()
    } catch (err) {
      setSpanAttribute(span, "error", String(err))
    } finally {
      const duration = performance.now() - startTime
      const status = c.res?.status || c.res instanceof Response ? c.res.status : 200
      endSpan(span, { code: status })
      getHistogram("http.request.duration", "HTTP request duration (ms)").record(duration)
      getCounter("http.requests.by_status", "Requests by status").add(1, { status: String(status) })

      exp.export(span.traceId, [span]).catch(() => {})
    }
  }
}

// ═══════════════════════════════════════════════════
// Metrics endpoint
// ═══════════════════════════════════════════════════

export function metricsEndpoint(prefix = "Zorux") {
  return async (c: any) => {
    const lines: string[] = []

    for (const counter of counters) {
      const snap = counter.snapshot()
      lines.push(`# HELP ${prefix}_${counter.name} ${counter.description}`)
      lines.push(`# TYPE ${prefix}_${counter.name} counter`)
      lines.push(`${prefix}_${counter.name}_total ${snap.total}`)
    }

    for (const hist of histograms) {
      const snap = hist.snapshot()
      if (snap.count > 0) {
        lines.push(`# HELP ${prefix}_${hist.name} ${hist.description}`)
        lines.push(`# TYPE ${prefix}_${hist.name} histogram`)
        lines.push(`${prefix}_${hist.name}_count ${snap.count}`)
        lines.push(`${prefix}_${hist.name}_sum ${snap.sum.toFixed(0)}`)
        lines.push(`${prefix}_${hist.name}_avg ${snap.avg.toFixed(2)}`)
      }
    }

    return c.text(lines.join("\n"), 200, { "Content-Type": "text/plain; charset=utf-8" })
  }
}

// ═══════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════

let currentExporter: Exporter | null = null

export function createTelemetry(config?: { exporter?: string; endpoint?: string }): Exporter {
  const exporter = config?.exporter || process.env.TELEMETRY_EXPORTER || "console"

  switch (exporter) {
    case "otlp":
    case "otel":
      currentExporter = new OTLPExporter(config?.endpoint)
      return currentExporter
    default:
      currentExporter = new ConsoleExporter()
      return currentExporter
  }
}

export function getExporter(): Exporter | null {
  return currentExporter
}

export { counters, histograms }
