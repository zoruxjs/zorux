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
        <link rel="stylesheet" href={"/static/daisyui.min.css" + (CB ? "?v=" + CB : "")} />
        <link rel="stylesheet" href={"/static/Zorux.css" + (CB ? "?v=" + CB : "")} />
        <script src={"/static/turbo.js" + (CB ? "?v=" + CB : "")}></script>
        <script>{`
(function(){
var t=localStorage.getItem("Zorux-theme")||"light"
document.documentElement.setAttribute("data-theme",t)
window.__setTheme=function(t){localStorage.setItem("Zorux-theme",t);document.documentElement.setAttribute("data-theme",t)}
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
        <div class="drawer lg:drawer-open">
          <input id="sidebar-toggle" type="checkbox" class="drawer-toggle" />
          <div class="drawer-content flex flex-col">
            <div class="navbar bg-base-100 border-b border-base-200 sticky top-0 z-20">
              <div class="flex-1">
                <label for="sidebar-toggle" class="btn btn-ghost btn-sm drawer-button lg:hidden">☰</label>
                <span class="font-semibold text-sm">{title}</span>
              </div>
              <div class="flex gap-1 items-center">
                <button id="theme-btn" onclick="__toggleTheme()" class="btn btn-ghost btn-sm" title="Toggle theme" style="font-size:1.1rem">🌙</button>
                <div class="notif-wrapper">
                  <button id="notif-bell" onclick="document.getElementById('notif-dropdown').classList.toggle('visible')" class="btn btn-ghost btn-sm" style="font-size:1.1rem;position:relative">
                    🔔
                    <span id="notif-count" class="notif-count"></span>
                  </button>
                  <div id="notif-dropdown" class="notif-dropdown">
                    <div class="flex items-center justify-between px-4 py-3 border-b border-base-200">
                      <strong class="text-sm">Notifications</strong>
                      <button onclick="markAllN()" class="btn btn-ghost btn-xs">Mark all read</button>
                    </div>
                    <div id="notif-list"></div>
                    <div class="p-2 text-center border-t border-base-200">
                      <a href="/admin/notifications" class="text-xs opacity-50 hover:opacity-100 no-underline">View all</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <main class="p-4 lg:p-6">
              {children}
            </main>
          </div>
          <div class="drawer-side">
            <label for="sidebar-toggle" aria-label="close sidebar" class="drawer-overlay"></label>
            <div class="bg-base-200 min-h-full w-64 p-4 flex flex-col">
              <div class="flex items-center gap-2 px-2 pb-4 mb-2 border-b border-base-300">
                <svg width="24" height="24" viewBox="0 0 100 100" style="flex-shrink:0"><rect width="100" height="100" rx="20" fill="var(--color-primary)"/><text x="50" y="68" text-anchor="middle" fill="var(--color-primary-content)" font-size="50" font-weight="bold" font-family="system-ui">Z</text></svg>
                <span class="font-bold text-sm">Zorux</span>
              </div>
              <ul class="menu px-0 flex-1">
                <li class="menu-title">Admin</li>
                <li><a href="/admin">Dashboard</a></li>
                {models?.map(m => (
                  <li><a href={base + m.tableName}>{m.plural || m.name}</a></li>
                ))}
                <li class="menu-title" style="margin-top:0.5rem">System</li>
                <li><a href="/admin/features">Feature Flags</a></li>
                <li><a href="/admin/emails">Email Sandbox</a></li>
                <li><a href="/admin/monitor">Monitor</a></li>
              </ul>
              {user ? (
                <div class="flex items-center gap-3 px-3 py-3 mt-auto border-t border-base-300">
                  <div class="avatar placeholder">
                    <div class="bg-primary text-primary-content w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">{(user.name || "U")[0]}</div>
                  </div>
                  <div>
                    <div class="text-sm font-medium">{user.name}</div>
                    <a href="/logout" class="text-xs opacity-50 hover:opacity-100 no-underline">Logout</a>
                  </div>
                </div>
              ) : (
                <a href="/login" class="btn btn-soft btn-sm mt-auto">Login</a>
              )}
            </div>
          </div>
        </div>
        <script>{`
document.addEventListener("click",function(e){var dd=document.getElementById("notif-dropdown");if(dd&&!e.target.closest(".notif-wrapper"))dd.classList.remove("visible")})
`}</script>
      </body>
    </html>
  )
}
