import type { FC } from "hono/jsx"

// Cache buster for asset URLs — updated on each server restart
const _cb = typeof globalThis !== "undefined" ? (globalThis as any).__Zorux_ASSET_CB : ""
const CB = _cb || ""

interface LayoutProps {
  title: string
  user?: any
  models?: { tableName: string }[]
  children: any
}

export const Layout: FC<LayoutProps> = ({ title, user, models, children }) => {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0f172a" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>{title}</title>
        <link rel="stylesheet" href={"/static/Zorux.css" + (CB ? "?v=" + CB : "")} />
        <script src={"/static/turbo.js" + (CB ? "?v=" + CB : "")}></script>
        <script>navigator.serviceWorker?.register("/sw.js")["catch"](()=>{})</script>
        <script>{`
(function(){
// Theme management
var savedTheme=localStorage.getItem("Zorux-theme")||"dark"
document.documentElement.setAttribute("data-theme",savedTheme)
window.__setTheme=function(t){localStorage.setItem("Zorux-theme",t);document.documentElement.setAttribute("data-theme",t)
var btn=document.getElementById("theme-btn");if(btn)btn.textContent=t==="dark"?"??":"??"}
window.__toggleTheme=function(){window.__setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark")}

// Notifications
var TOKEN=(document.cookie.match(/token=([^;]+)/)||[])[1]
if(TOKEN){
function loadNotif(){fetch("/api/notifications",{headers:{Authorization:"Bearer "+TOKEN}}).then(function(r){return r.json()}).then(function(d){
var bell=document.getElementById("notif-bell"),count=document.getElementById("notif-count")
if(!bell||!count)return
count.textContent=d.unread||"";count.style.display=d.unread>0?"flex":"none"
var list=document.getElementById("notif-list")
if(list&&d.notifications){list.innerHTML=d.notifications.slice(0,5).map(function(n){return '<div class="notif-item'+(n.read_at?' notif-read':'')+'" onclick="markNotif('+n.id+')"><div class="notif-title">'+n.title+'</div><div class="notif-body">'+(n.body||"")+'</div></div>'}).join("")}
}).catch(function(){})}
window.markNotif=function(id){fetch("/api/notifications/"+id+"/read",{method:"PUT",headers:{Authorization:"Bearer "+TOKEN}}).then(function(){loadNotif()})}
window.markAllNotif=function(){fetch("/api/notifications/read-all",{method:"POST",headers:{Authorization:"Bearer "+TOKEN}}).then(function(){loadNotif()})}
loadNotif();setInterval(loadNotif,30000)
}
})()
`}</script>
      </head>
      <body>
        <div class="app-shell">
          <header class="app-header">
            <a href="/" class="logo">Zorux</a>
            <nav>
              <a href="/admin">Admin</a>
              {user ? (
                <>
                  <button id="theme-btn" onclick="__toggleTheme()" style="background:none;border:none;cursor:pointer;color:var(--text);font-size:1rem;padding:4px 8px" title="Toggle theme">??</button>
                  <div class="notif-wrapper" style="position:relative;display:inline-block">
                    <button id="notif-bell" onclick="document.getElementById('notif-dropdown').classList.toggle('visible')" style="background:none;border:none;cursor:pointer;color:var(--text);font-size:1rem;position:relative;padding:4px 8px">
                      ??
                      <span id="notif-count" style="display:none;position:absolute;top:-2px;right:-2px;background:#ef4444;color:#fff;font-size:10px;width:16px;height:16px;border-radius:50%;align-items:center;justify-content:center;font-weight:700"></span>
                    </button>
                    <div id="notif-dropdown" class="notif-dropdown" style="display:none;position:absolute;right:0;top:100%;width:320px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:100;max-height:400px;overflow-y:auto">
                      <div style="padding:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                        <strong style="color:var(--text)">Notifications</strong>
                        <button onclick="markAllNotif()" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:12px">Mark all read</button>
                      </div>
                      <div id="notif-list"></div>
                      <div style="padding:8px;text-align:center;border-top:1px solid var(--border)">
                        <a href="/admin/notifications" style="color:var(--text-muted);font-size:12px;text-decoration:none">View all</a>
                      </div>
                    </div>
                  </div>
                  <span class="text-sm">{user.name} <a href="/logout">Logout</a></span>
                </>
              ) : (
                <a href="/login">Login</a>
              )}
            </nav>
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
