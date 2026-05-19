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
:root{--p:oklch(70% 0.191 22.216);--er:oklch(64% 0.246 16.439);--erc:oklch(96% 0.015 12.422);--b1:oklch(98% 0.001 106.423);--b2:oklch(97% 0.001 106.424);--b3:oklch(92% 0.003 48.717);--bc:oklch(21% 0.006 56.043);--in:oklch(68% 0.169 237.323);--radius-field:0.5rem;--radius-box:0.75rem}
[data-theme="dark"]{--p:oklch(75% 0.191 22.216);--er:oklch(68% 0.246 16.439);--erc:oklch(20% 0.015 12.422);--b1:oklch(20% 0.005 285);--b2:oklch(25% 0.006 285);--b3:oklch(30% 0.008 285);--bc:oklch(85% 0.005 285);--in:oklch(72% 0.169 237.323)}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:var(--b2);color:var(--bc);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem}
.error-card{max-width:640px;width:100%;background:var(--b1);border-radius:var(--radius-box);border:1px solid color-mix(in oklch, var(--bc) 10%, transparent);overflow:hidden;box-shadow:0 4px 24px color-mix(in oklch, var(--bc) 8%, transparent)}
.error-accent{height:3px;background:${accent}}
.error-body{padding:1.5rem}
.error-code{font-size:2.75rem;font-weight:800;line-height:1;color:${accent};margin-bottom:0.25rem}
.error-title{font-size:1.05rem;font-weight:600;margin-bottom:0.75rem}
.error-msg{font-family:ui-monospace,monospace;font-size:0.82rem;opacity:0.7;background:var(--b2);padding:0.75rem 1rem;border-radius:var(--radius-field);overflow-x:auto;white-space:pre-wrap;word-break:break-all;margin-bottom:0.75rem}
.error-meta{display:flex;gap:0.5rem;flex-wrap:wrap;font-size:0.72rem;opacity:0.4}
.error-meta span{background:var(--b2);padding:0.15rem 0.5rem;border-radius:var(--radius-field)}
.section-title{font-size:0.68rem;font-weight:700;opacity:0.4;text-transform:uppercase;letter-spacing:0.08em;margin:1.25rem 0 0.5rem}
.stack-box{background:var(--b2);border-radius:var(--radius-field);padding:0.75rem 1rem;font-family:ui-monospace,monospace;font-size:0.72rem;line-height:1.6;overflow-x:auto;max-height:260px;overflow-y:auto}
.stack-line{display:block}
.stack-location{color:var(--in);margin-right:0.5rem}
.hint-box{background:var(--b2);border-radius:var(--radius-box);padding:1.25rem;margin-top:1.25rem}
.hint-box h3{color:${accent};font-size:0.85rem;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.375rem}
.hint-box ul{list-style:none;padding:0}
.hint-box li{padding:0.3rem 0;font-size:0.82rem;display:flex;align-items:flex-start;gap:0.375rem}
.hint-box li::before{content:"\\2192";opacity:0.4;flex-shrink:0}
.hint-box a{color:var(--p);text-decoration:underline}
.footer{text-align:center;padding:1.5rem 1rem 0;font-size:0.72rem;opacity:0.3}
@media(max-width:480px){.error-body{padding:1.25rem}.error-code{font-size:2.25rem}}
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
            <div class="error-msg">{message}</div>
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
