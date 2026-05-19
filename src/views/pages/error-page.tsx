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

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{statusCode} — {title}</title>
        <style>{`
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif; background:#0f172a; color:#e2e8f0; min-height:100vh; display:flex; flex-direction:column; }
.error-container { max-width:800px; margin:40px auto; padding:0 20px; flex:1; }
.error-header { border-left:4px solid ${statusCode >= 500 ? "#ef4444" : "#f59e0b"}; padding:16px 20px; background:#1e293b; border-radius:8px; margin-bottom:16px; }
.error-status { font-size:48px; font-weight:800; color:${statusCode >= 500 ? "#ef4444" : "#f59e0b"}; line-height:1; }
.error-title { font-size:20px; font-weight:600; margin:8px 0 4px; }
.error-message { font-family:'SF Mono',Monaco,monospace; font-size:14px; color:#94a3b8; padding:12px 16px; background:#0f172a; border-radius:6px; margin:12px 0; overflow-x:auto; white-space:pre-wrap; word-break:break-all; }
.error-meta { display:flex; gap:16px; font-size:12px; color:#64748b; margin-top:8px; flex-wrap:wrap; }
.error-meta span { background:#334155; padding:2px 8px; border-radius:4px; }
.section-title { font-size:14px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin:24px 0 8px; }
.stack-frame { background:#1e293b; border-radius:6px; padding:12px 16px; font-family:'SF Mono',Monaco,monospace; font-size:12px; line-height:1.6; overflow-x:auto; }
.stack-line { display:block; color:#e2e8f0; }
.stack-location { color:#3b82f6; margin-right:8px; }
.hint-box { background:#1e293b; border:1px solid #334155; border-radius:8px; padding:16px; margin:24px 0; }
.hint-box h3 { color:#f59e0b; font-size:14px; margin-bottom:8px; }
.hint-box ul { list-style:none; padding:0; }
.hint-box li { padding:4px 0; font-size:13px; color:#94a3b8; }
.hint-box li::before { content:"→ "; color:#64748b; }
.footer { text-align:center; padding:24px; font-size:12px; color:#475569; }
`}</style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-header">
            <div class="error-status">{statusCode}</div>
            <div class="error-title">{title}</div>
            <div class="error-message">{message}</div>
            <div class="error-meta">
              {method && <span>{method}</span>}
              {path && <span>{path}</span>}
              {timestamp && <span>{timestamp}</span>}
              <span>Zorux v0.1.0</span>
            </div>
          </div>

          {isDev && stack && (
            <>
              <div class="section-title">Stack trace</div>
              <div class="stack-frame" dangerouslySetInnerHTML={{ __html: codeFrame(stack) }} />
            </>
          )}

          {(() => {
            const { hints: hintList, docs } = getHints(message, statusCode)
            return (
              <div class="hint-box">
                <h3>💡 Suggestions</h3>
                <ul>
                  {hintList.slice(0, 4).map(h => <li>{h}</li>)}
                  {docs && <li>📖 <a href={docs} style="color:#3b82f6;text-decoration:underline">Documentation</a></li>}
                </ul>
              </div>
            )
          })()}
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

  // For API requests, return JSON instead
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
