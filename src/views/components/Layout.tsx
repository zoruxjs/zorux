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
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0f172a" />
        <title>{title}</title>
        <link rel="stylesheet" href={"/static/Zorux.css" + (CB ? "?v=" + CB : "")} />
        <script src={"/static/turbo.js" + (CB ? "?v=" + CB : "")}></script>
        <script>{`
(function(){
var t=localStorage.getItem("Zorux-theme")||"dark"
document.documentElement.setAttribute("data-theme",t)
window.__setTheme=function(t){localStorage.setItem("Zorux-theme",t);document.documentElement.setAttribute("data-theme",t)
var b=document.getElementById("theme-btn");if(b)b.innerHTML=t==="dark"?'<span>\\u2600</span>':'<span>\\uD83C\\uDF19</span>'}
window.__toggleTheme=function(){window.__setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark")}
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
        <div class="app-shell">
          <aside class="sidebar">
            <div class="sidebar-logo">
              <svg width="22" height="22" viewBox="0 0 100 100" style="flex-shrink:0"><rect width="100" height="100" rx="20" fill="#3b82f6"/><text x="50" y="68" text-anchor="middle" fill="white" font-size="50" font-weight="bold" font-family="system-ui">Z</text></svg>
              Zorux
            </div>
            <nav class="sidebar-nav">
              <div class="sidebar-group">
                <div class="sidebar-group-title">Admin</div>
                <a href="/admin" class="sidebar-link">Dashboard</a>
                {models?.map(m => (
                  <a href={base + m.tableName} class="sidebar-link">{m.plural || m.name}</a>
                ))}
              </div>
              <div class="sidebar-group" style="margin-top:0.5rem">
                <div class="sidebar-group-title">System</div>
                <a href="/admin/features" class="sidebar-link">Feature Flags</a>
                <a href="/admin/emails" class="sidebar-link">Email Sandbox</a>
                <a href="/admin/monitor" class="sidebar-link">Monitor</a>
              </div>
            </nav>
            <div style="padding:0.75rem 1.25rem;border-top:1px solid rgba(255,255,255,0.08);margin-top:auto">
              {user ? (
                <div style="font-size:0.8rem">
                  <div style="color:var(--text-sidebar);font-weight:500">{user.name}</div>
                  <a href="/logout" style="color:var(--text-sidebar);opacity:0.6;font-size:0.75rem">Logout</a>
                </div>
              ) : (
                <a href="/login" style="color:var(--text-sidebar)">Login</a>
              )}
            </div>
          </aside>

          <header class="app-header">
            <div class="header-title">{title}</div>
            <div class="header-right">
              <button id="theme-btn" onclick="__toggleTheme()" class="btn btn-ghost btn-sm" title="Toggle theme">☀️</button>
              <div class="notif-wrapper">
                <button id="notif-bell" onclick="document.getElementById('notif-dropdown').classList.toggle('visible')" class="notif-btn">
                  🔔
                  <span id="notif-count" class="notif-count"></span>
                </button>
                <div id="notif-dropdown" class="notif-dropdown">
                  <div class="notif-header">
                    <strong>Notifications</strong>
                    <button onclick="markAllN()" class="btn btn-ghost btn-sm">Mark all read</button>
                  </div>
                  <div id="notif-list"></div>
                  <div class="notif-footer">
                    <a href="/admin/notifications">View all</a>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main class="app-content">
            {children}
          </main>
        </div>
        <script>{`
document.addEventListener("click",function(e){var dd=document.getElementById("notif-dropdown");if(dd&&!e.target.closest(".notif-wrapper"))dd.classList.remove("visible")})
document.addEventListener("click",function(e){var dd=document.getElementById("notif-dropdown");if(dd&&dd.classList.contains("visible"))dd.style.display="block";else if(dd)dd.style.display="none"})
`}</script>
      </body>
    </html>
  )
}
