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
      return `<span class="stack-line"><span class="text-info font-mono">${short}:${line}:${col}</span>${l.replace(match[0], "").trim()}</span>`
    }
    return `<span class="stack-line">${l}</span>`
  }).join("\n")
}

export const ErrorPage: FC<ErrorPageProps> = (props) => {
  const { title, message, stack, statusCode, method, path, timestamp } = props
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development"
  const isServerError = statusCode >= 500
  const variant = isServerError ? "alert-error" : "alert-warning"

  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{statusCode} — {title}</title>
        <link rel="stylesheet" href="/static/admin.css" />
      </head>
      <body class="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <div class="max-w-xl w-full">
          <div class="card bg-base-100 border border-base-300">
            <div class={`alert ${variant} rounded-none rounded-t-box border-0`}>
              <span class="text-lg font-bold">{statusCode}</span>
              <span>{title}</span>
            </div>
            <div class="card-body p-5">
              <div class="text-sm font-mono bg-base-200 p-3 rounded-box whitespace-pre-wrap break-all mb-3">{message}</div>
              <div class="flex gap-2 flex-wrap text-xs opacity-40 mb-2">
                {method && <span class="bg-base-200 px-2 py-0.5 rounded-md">{method}</span>}
                {path && <span class="bg-base-200 px-2 py-0.5 rounded-md">{path}</span>}
                {timestamp && <span class="bg-base-200 px-2 py-0.5 rounded-md">{timestamp}</span>}
                <span class="bg-base-200 px-2 py-0.5 rounded-md">Zorux v0.1.0</span>
              </div>

              {isDev && stack && (
                <>
                  <div class="text-xs font-semibold opacity-40 uppercase tracking-wider mt-3 mb-1">Stack trace</div>
                  <div class="bg-base-200 p-3 rounded-box text-xs font-mono leading-relaxed overflow-x-auto max-h-60 overflow-y-auto" dangerouslySetInnerHTML={{ __html: codeFrame(stack) }} />
                </>
              )}

              {(() => {
                const { hints: hintList, docs } = getHints(message, statusCode)
                if (hintList.length === 0 && !docs) return null
                return (
                  <div class="bg-base-200 p-4 rounded-box mt-3">
                    <h3 class="text-sm font-semibold mb-2 flex items-center gap-1">
                      <span class={isServerError ? "text-error" : "text-warning"}>Suggestions</span>
                    </h3>
                    <ul class="text-sm space-y-1">
                      {hintList.slice(0, 4).map(h => <li class="flex items-start gap-1.5"><span class="opacity-30 mt-0.5">→</span><span>{h}</span></li>)}
                      {docs && <li class="flex items-start gap-1.5"><span class="opacity-30 mt-0.5">→</span><a href={docs} class="link link-primary">Documentation</a></li>}
                    </ul>
                  </div>
                )
              })()}
            </div>
          </div>
          <p class="text-center text-xs opacity-30 mt-4">Zorux Framework — {isDev ? "Development" : "Production"} mode</p>
        </div>
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
