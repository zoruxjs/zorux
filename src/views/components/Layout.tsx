import type { FC } from "hono/jsx"

const _cb = typeof globalThis !== "undefined" ? (globalThis as any).__Zorux_ASSET_CB : ""
const CB = _cb || ""

interface LayoutProps {
  title: string
  user?: any
  models?: { name: string; tableName: string; plural: string }[]
  active?: string
  children: any
}

export const Layout: FC<LayoutProps> = ({ title, user, models, children, active }) => {
  const base = "/admin/"
  const isActive = (p: string) => p === active ? "menu-active" : ""
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#ffffff" />
        <title>{title}</title>
        <link rel="stylesheet" href={"/static/admin.css" + (CB ? "?v=" + CB : "")} />
        <script src={"/static/turbo.js" + (CB ? "?v=" + CB : "")}></script>
        <script>{`
(function(){
var t=localStorage.getItem("zorux-theme")||"light"
document.documentElement.setAttribute("data-theme",t)
window.__setTheme=function(t){localStorage.setItem("zorux-theme",t);document.documentElement.setAttribute("data-theme",t)}
window.__toggleTheme=function(){var c=document.documentElement.getAttribute("data-theme");window.__setTheme(c==="light"?"dark":"light")}
var TK=(document.cookie.match(/token=([^;]+)/)||[])[1]
if(TK){
function ld(){fetch("/api/notifications",{headers:{Authorization:"Bearer "+TK}}).then(function(r){return r.json()}).then(function(d){
var c=document.getElementById("nc")
if(c){c.textContent=d.unread||"";c.style.display=d.unread>0?"inline-flex":"none"}
var l=document.getElementById("nl")
if(l&&d.notifications){l.innerHTML=d.notifications.slice(0,5).map(function(n){return '<div class="flex items-center gap-2 p-3 border-b border-base-200 hover:bg-base-200 cursor-pointer'+(n.read_at?' opacity-40':'')+'" onclick="mk('+n.id+')"><div><div class="text-sm font-medium">'+n.title+'</div><div class="text-xs opacity-60">'+(n.body||"")+'</div></div></div>'}).join("")}
}).catch(function(){})}
window.mk=function(id){fetch("/api/notifications/"+id+"/read",{method:"PUT",headers:{Authorization:"Bearer "+TK}}).then(function(){ld()})}
window.mkAll=function(){fetch("/api/notifications/read-all",{method:"POST",headers:{Authorization:"Bearer "+TK}}).then(function(){ld()})}
ld();setInterval(ld,30000)
}
})()
`}</script>
      </head>
      <body>
        <div class="drawer lg:drawer-open">
          <input id="st" type="checkbox" class="drawer-toggle" />
          <div class="drawer-content flex flex-col">
            <nav class="navbar bg-base-100/80 backdrop-blur border-b border-base-200 sticky top-0 z-20">
              <div class="flex-1 flex items-center gap-2">
                <label for="st" class="btn btn-ghost btn-sm drawer-button lg:hidden">☰</label>
                <span class="font-semibold text-sm tracking-tight">{title}</span>
              </div>
              <div class="flex gap-1 items-center">
                <button id="theme-btn" onclick="__toggleTheme()" class="btn btn-ghost btn-square btn-sm tooltip tooltip-bottom" data-tip="Theme" style="font-size:1.1rem">🌙</button>
                <div class="dropdown dropdown-end">
                  <button id="nf" tabindex="0" role="button" class="btn btn-ghost btn-square btn-sm relative" style="font-size:1.1rem">
                    🔔
                    <span id="nc" class="badge badge-error badge-xs absolute -top-1 -right-1 hidden"></span>
                  </button>
                  <div tabindex="0" class="dropdown-content card card-sm bg-base-100 border border-base-200 shadow-xl mt-2 w-80 z-50">
                    <div class="flex items-center justify-between px-4 py-3 border-b border-base-200">
                      <strong class="text-sm font-medium">Notifications</strong>
                      <button onclick="mkAll()" class="btn btn-ghost btn-xs text-primary">Mark all read</button>
                    </div>
                    <div id="nl" class="max-h-80 overflow-y-auto"></div>
                    <div class="p-2 text-center border-t border-base-200">
                      <a href="/admin/notifications" class="text-xs opacity-40 hover:opacity-80 no-underline">View all</a>
                    </div>
                  </div>
                </div>
              </div>
            </nav>
            <main class="p-4 lg:p-6">{children}</main>
          </div>
          <div class="drawer-side z-30">
            <label for="st" aria-label="close sidebar" class="drawer-overlay"></label>
            <div class="bg-base-200 min-h-full w-64 p-3 flex flex-col gap-1">
              <div class="flex items-center gap-2.5 px-3 py-3 mb-1">
                <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-content font-bold text-sm">Z</div>
                <span class="font-bold text-sm tracking-tight">Zorux</span>
              </div>
              <ul class="menu px-0 flex-1 gap-px">
                <li class="menu-title">Admin</li>
                <li><a href="/admin" class={isActive("dashboard")}>Dashboard</a></li>
                {models?.map(m => (
                  <li><a href={base + m.tableName} class={isActive(m.tableName)}>{m.plural || m.name}</a></li>
                ))}
                <li class="menu-title" style="margin-top:0.5rem">System</li>
                <li><a href="/admin/features" class={isActive("features")}>Feature Flags</a></li>
                <li><a href="/admin/emails" class={isActive("emails")}>Email Sandbox</a></li>
                <li><a href="/admin/monitor" class={isActive("monitor")}>Monitor</a></li>
              </ul>
              {user ? (
                <div class="flex items-center gap-3 px-3 py-3 mt-auto border-t border-base-300">
                  <div class="avatar placeholder">
                    <div class="bg-primary text-primary-content w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm">{(user.name || "U")[0]}</div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">{user.name}</div>
                    <a href="/logout" class="text-xs opacity-40 hover:opacity-80 no-underline">Logout</a>
                  </div>
                </div>
              ) : (
                <a href="/login" class="btn btn-primary btn-sm mt-auto">Login</a>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
