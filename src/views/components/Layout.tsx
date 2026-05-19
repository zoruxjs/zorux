import type { FC } from "hono/jsx"

const _cb = typeof globalThis !== "undefined" ? (globalThis as any).__Zorux_ASSET_CB : ""
const CB = _cb || ""

interface LayoutProps {
  title: string
  user?: any
  models?: { name: string; tableName: string; plural: string }[]
  children: any
}

export const Layout: FC<LayoutProps> = ({ title, user, models, children }) => {
  const base = "/admin/"
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#ffffff" />
        <title>{title}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/daisyui@5" />
        <link rel="stylesheet" href={"/static/Zorux.css" + (CB ? "?v=" + CB : "")} />
        <script src={"/static/turbo.js" + (CB ? "?v=" + CB : "")}></script>
        <script>{`
(function(){
var t=localStorage.getItem("Zorux-theme")||"light"
document.documentElement.setAttribute("data-theme",t)
window.__setTheme=function(t){localStorage.setItem("Zorux-theme",t);document.documentElement.setAttribute("data-theme",t)
var b=document.getElementById("theme-btn");if(b)b.innerHTML=t==="light"?'<span>\\uD83C\\uDF19</span>':'<span>\\u2600</span>'}
window.__toggleTheme=function(){var c=document.documentElement.getAttribute("data-theme");window.__setTheme(c==="light"?"dark":"light")}
var TOKEN=(document.cookie.match(/token=([^;]+)/)||[])[1]
if(TOKEN){
function loadN(){fetch("/api/notifications",{headers:{Authorization:"Bearer "+TOKEN}}).then(function(r){return r.json()}).then(function(d){
var b=document.getElementById("notif-bell"),c=document.getElementById("notif-count")
if(b&&c){c.textContent=d.unread||"";c.style.display=d.unread>0?"flex":"none"}
var l=document.getElementById("notif-list")
if(l&&d.notifications){l.innerHTML=d.notifications.slice(0,5).map(function(n){return '<div class="notif-item'+(n.read_at?' notif-read':'')+'" onclick="markN('+n.id+')"><div class="notif-title">'+n.title+'</div><div class="notif-body">'+(n.body||"")+'</div></div>'}).join("")}
}).catch(function(){})}
window.markN=function(id){fetch("/api/notifications/"+id+"/read",{method:"PUT",headers:{Authorization:"Bearer "+TOKEN}}).then(function(){loadN()})}
window.markAllN=function(){fetch("/api/notifications/read-all",{method:"POST",headers:{Authorization:"Bearer "+TOKEN}}).then(function(){loadN()})}
loadN();setInterval(loadN,30000)
}
})()
`}</script>
      </head>
      <body>
        <div class="drawer">
          <aside class="drawer-side">
            <div class="sidebar-logo">
              <svg width="24" height="24" viewBox="0 0 100 100" style="flex-shrink:0"><rect width="100" height="100" rx="20" fill="var(--p)"/><text x="50" y="68" text-anchor="middle" fill="var(--pc)" font-size="50" font-weight="bold" font-family="system-ui">Z</text></svg>
              Zorux
            </div>
            <nav class="sidebar-nav">
              <div class="sidebar-label">Admin</div>
              <a href="/admin" class="sidebar-link">Dashboard</a>
              {models?.map(m => (
                <a href={base + m.tableName} class="sidebar-link">{m.plural || m.name}</a>
              ))}
              <div class="sidebar-label" style="margin-top:1rem">System</div>
              <a href="/admin/features" class="sidebar-link">Feature Flags</a>
              <a href="/admin/emails" class="sidebar-link">Email Sandbox</a>
              <a href="/admin/monitor" class="sidebar-link">Monitor</a>
            </nav>
            <div style="padding:0.75rem;margin-top:auto;border-top:1px solid color-mix(in oklch, var(--bc) 8%, transparent)">
              {user ? (
                <div class="flex items-center gap-2" style="padding:0 0.25rem">
                  <div style="width:32px;height:32px;border-radius:999px;background:var(--p);display:grid;place-items:center;font-size:0.8rem;font-weight:700;color:var(--pc)">{(user.name || "U")[0]}</div>
                  <div>
                    <div style="font-size:0.82rem;font-weight:500;color:var(--bc)">{user.name}</div>
                    <a href="/logout" style="font-size:0.72rem;opacity:0.4;color:var(--bc);text-decoration:none">Logout</a>
                  </div>
                </div>
              ) : (
                <a href="/login" class="sidebar-link" style="justify-content:center">Login</a>
              )}
            </div>
          </aside>

          <div class="drawer-content">
            <div class="navbar">
              <div class="navbar-title">{title}</div>
              <div class="navbar-end">
                <button id="theme-btn" onclick="__toggleTheme()" class="btn btn-ghost btn-sm" title="Toggle theme" style="border:none;font-size:1.1rem;padding:0.25rem 0.5rem;border-radius:var(--radius-field)">🌙</button>
                <div class="notif-wrapper">
                  <button id="notif-bell" onclick="document.getElementById('notif-dropdown').classList.toggle('visible')" class="btn btn-ghost btn-sm" style="border:none;font-size:1.1rem;padding:0.25rem 0.5rem;border-radius:var(--radius-field);position:relative">
                    🔔
                    <span id="notif-count" class="notif-count"></span>
                  </button>
                  <div id="notif-dropdown" class="notif-dropdown">
                    <div style="padding:0.75rem 1rem;border-bottom:1px solid color-mix(in oklch, var(--bc) 8%, transparent);display:flex;justify-content:space-between;align-items:center">
                      <strong style="font-size:0.85rem">Notifications</strong>
                      <button onclick="markAllN()" class="btn btn-ghost btn-xs">Mark all read</button>
                    </div>
                    <div id="notif-list"></div>
                    <div style="padding:0.5rem;text-align:center;border-top:1px solid color-mix(in oklch, var(--bc) 8%, transparent)">
                      <a href="/admin/notifications" style="font-size:0.78rem;opacity:0.5;text-decoration:none">View all</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <main class="main-content">
              {children}
            </main>
          </div>
        </div>
        <script>{`
document.addEventListener("click",function(e){var dd=document.getElementById("notif-dropdown");if(dd&&!e.target.closest(".notif-wrapper"))dd.classList.remove("visible")})
`}</script>
      </body>
    </html>
  )
}
