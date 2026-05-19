import type { FC } from "hono/jsx"

export const SiteLayout: FC<{ title: string; active?: string; children: any }> = ({ title, active, children }) => {
  const isActive = (p: string) => active === p ? ' style="color:var(--text)"' : ""
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — Zorux</title>
        <link rel="stylesheet" href="/static/site.css" />
      </head>
      <body>
        <nav class="navbar">
          <a href="/" class="navbar-brand" style="color:var(--text);display:flex;align-items:center;gap:10px">
            <span style="width:24px;height:24px;border-radius:6px;background:var(--gradient-accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">Z</span>
            Zorux
          </a>
          <div class="navbar-links">
            <a href="/" {...isActive("home")}>Home</a>
            <a href="/features" {...isActive("features")}>Features</a>
            <a href="/docs" {...isActive("docs")}>Docs</a>
            <a href="https://github.com/zoruxjs/zorux">GitHub</a>
          </div>
          <div>
            <a href="/install" class="btn btn-primary btn-sm">Get Started</a>
          </div>
        </nav>
        {children}
        <footer class="footer">
          <div class="footer-links">
            <a href="/">Home</a>
            <a href="/features">Features</a>
            <a href="/docs">Docs</a>
            <a href="https://github.com/zoruxjs/zorux">GitHub</a>
          </div>
          <p style="font-size:0.8rem;color:var(--text-tertiary)">MIT License · Built with <a href="https://zorux.dev">Zorux</a></p>
        </footer>
      </body>
    </html>
  )
}

export const DocSidebar: FC<{ active: string }> = ({ active }) => {
  const items = [
    { cat: "Getting Started", links: [
      { h: "/docs", l: "Introduction" },
      { h: "/install", l: "Installation" },
      { h: "/quickstart", l: "Quick Start" },
    ]},
    { cat: "Reference", links: [
      { h: "/docs/yaml", l: "app.yaml" },
      { h: "/docs/api", l: "API Routes" },
      { h: "/docs/auth", l: "Authentication" },
      { h: "/docs/abac", l: "ABAC Policies" },
      { h: "/docs/plugins", l: "Plugins" },
    ]},
  ]
  return (
    <aside class="docs-side">
      <div style="font-size:0.9rem;font-weight:700;margin-bottom:24px;display:flex;align-items:center;gap:8px">
        <span style="width:20px;height:20px;border-radius:4px;background:var(--gradient-accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800">Z</span>
        Docs
      </div>
      {items.map(section => (
        <>
          <div class="cat">{section.cat}</div>
          {section.links.map(link => (
            <a href={link.h} class={active === link.l.toLowerCase() ? "active" : ""}>{link.l}</a>
          ))}
        </>
      ))}
    </aside>
  )
}
