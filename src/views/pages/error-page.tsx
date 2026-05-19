import type { FC } from "hono/jsx"
import { getHints } from "../../core/hints"

interface ErrorPageProps {
  title: string
  message: string
  stack?: string
  statusCode: number
  method?: string
  path?: string
  timestamp?: string
}

function codeFrame(stack: string): string {
  const lines = stack.split("\n")
  return lines.map(l => {
    const match = l.match(/\((.+):(\d+):(\d+)\)/)
    if (match) {
      const [, file, line, col] = match
      const short = file.split(/[/\\]/).slice(-3).join("/")
      return `<span class="stack-line"><span class="stack-location">${short}:${line}:${col}</span>${l.replace(match[0], "").trim()}</span>`
    }
    return `<span class="stack-line">${l}</span>`
  }).join("\n")
}

export const ErrorPage: FC<ErrorPageProps> = (props) => {
  const { title, message, stack, statusCode, method, path, timestamp } = props
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development"
  const isServerError = statusCode >= 500
  const accent = isServerError ? "#ef4444" : "#f59e0b"

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{statusCode} — {title}</title>
        <style>{`
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem}
.error-card{max-width:680px;width:100%;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4)}
.error-accent{height:4px;background:${accent}}
.error-body{padding:2rem}
.error-code{font-size:3.5rem;font-weight:800;line-height:1;color:${accent};margin-bottom:0.5rem}
.error-title{font-size:1.25rem;font-weight:600;color:#f1f5f9;margin-bottom:1rem}
.error-message{font-family:'SF Mono',Monaco,'Cascadia Code',monospace;font-size:0.85rem;color:#94a3b8;background:#0f172a;padding:0.75rem 1rem;border-radius:8px;border:1px solid #334155;overflow-x:auto;white-space:pre-wrap;word-break:break-all;margin-bottom:1rem}
.error-meta{display:flex;gap:0.75rem;flex-wrap:wrap;font-size:0.75rem;color:#64748b;margin-bottom:0}
.error-meta span{background:#334155;padding:0.2rem 0.6rem;border-radius:4px}
.section-title{font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin:1.5rem 0 0.5rem}
.stack-box{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:0.75rem 1rem;font-family:'SF Mono',Monaco,'Cascadia Code',monospace;font-size:0.75rem;line-height:1.7;overflow-x:auto;max-height:300px;overflow-y:auto}
.stack-line{display:block;color:#e2e8f0}
.stack-location{color:#60a5fa;margin-right:0.5rem}
.hint-box{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:1.25rem;margin-top:1.5rem}
.hint-box h3{color:${accent};font-size:0.85rem;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.375rem}
.hint-box ul{list-style:none;padding:0}
.hint-box li{padding:0.35rem 0;font-size:0.82rem;color:#94a3b8;display:flex;align-items:flex-start;gap:0.375rem}
.hint-box li::before{content:"\\2192";color:#64748b;flex-shrink:0}
.hint-box a{color:#60a5fa;text-decoration:underline}
.footer{text-align:center;padding:2rem 1rem 0;font-size:0.75rem;color:#475569}
.error-icon{font-size:1.25rem;margin-right:0.5rem}
@media(max-width:480px){.error-body{padding:1.25rem}.error-code{font-size:2.5rem}}
`}</style>
      </head>
      <body>
        <div class="error-card">
          <div class="error-accent"></div>
          <div class="error-body">
            <div class="error-code">
              <span class="error-icon">{isServerError ? "⚠️" : "⛔"}</span>
              {statusCode}
            </div>
            <div class="error-title">{title}</div>
            <div class="error-message">{message}</div>
            <div class="error-meta">
              {method && <span>{method}</span>}
              {path && <span>{path}</span>}
              {timestamp && <span>{timestamp}</span>}
              <span>Zorux v0.1.0</span>
            </div>

            {isDev && stack && (
              <>
                <div class="section-title">Stack trace</div>
                <div class="stack-box" dangerouslySetInnerHTML={{ __html: codeFrame(stack) }} />
              </>
            )}

            {(() => {
              const { hints: hintList, docs } = getHints(message, statusCode)
              if (hintList.length === 0 && !docs) return null
              return (
                <div class="hint-box">
                  <h3>Suggestions</h3>
                  <ul>
                    {hintList.slice(0, 4).map(h => <li>{h}</li>)}
                    {docs && <li>📖 <a href={docs}>Documentation</a></li>}
                  </ul>
                </div>
              )
            })()}
          </div>
        </div>
        <div class="footer">Zorux Framework v0.1.0 — {isDev ? "Development" : "Production"} mode</div>
      </body>
    </html>
  )
}

export function renderErrorPage(err: Error, statusCode: number, req?: Request): Response {
  const html = (
    <ErrorPage
      title={statusCode >= 500 ? "Internal Server Error" : "Bad Request"}
      message={err.message}
      stack={err.stack}
      statusCode={statusCode}
      method={req?.method}
      path={req?.url ? new URL(req.url).pathname : undefined}
      timestamp={new Date().toISOString()}
    />
  )

  const accept = req?.headers.get("accept") || ""
  if (accept.includes("application/json") || req?.url?.includes("/api/")) {
    return new Response(JSON.stringify({
      error: err.message,
      status: statusCode,
      ...(!process.env.NODE_ENV || process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
    }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(`<!DOCTYPE html>${html}`, {
    status: statusCode,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
