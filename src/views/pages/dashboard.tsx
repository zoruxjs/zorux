import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface Stat { name: string; table: string; count: number; plural: string }
interface Recent { model: string; id: any; title: string; time: string }
interface DashboardProps { user?: any; models?: any[]; stats: Stat[]; recent: Recent[]; active?: string }

const ICONS: Record<string, string> = {
  User: "👤", Lead: "🎯", Contact: "📇", Deal: "💼", Product: "📦", Activity: "📊", Note: "📝",
  Project: "🏗️", Subscription: "💳", Invoice: "📄", Page: "📄", Post: "📰", Category: "📁", Comment: "💬",
  Subscriber: "📬", Campaign: "📣", Order: "🛒", Review: "⭐",
}

function Bar({ stats }: { stats: Stat[] }) {
  const max = Math.max(...stats.map(s => s.count), 1)
  const h = 160
  return (
    <div class="flex items-end gap-3 h-40">
      {stats.map((s, i) => {
        const bh = Math.max(4, (s.count / max) * 140)
        const colors = ["bg-primary", "bg-secondary", "bg-accent", "bg-info", "bg-success", "bg-warning"]
        return (
          <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span class="text-xs font-bold opacity-70">{s.count}</span>
            <div class={`w-full rounded-t-md ${colors[i % colors.length]} opacity-80 hover:opacity-100 transition-opacity`} style={{ height: `${bh}px`, minHeight: "4px" }}></div>
            <span class="text-[10px] opacity-40 truncate w-full text-center">{s.name}</span>
          </div>
        )
      })}
    </div>
  )
}

export const Dashboard: FC<DashboardProps> = ({ user, models, stats, recent, active }) => (
  <Layout title="Dashboard" user={user} models={models} active={active}>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p class="text-sm opacity-50 mt-0.5">Overview of your application</p>
      </div>
      <div class="flex gap-2">
        <a href="/admin/monitor" class="btn btn-soft btn-sm">System Status</a>
        <a href="/admin/emails" class="btn btn-soft btn-sm">Email Log</a>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map(s => (
        <a href={"/admin/" + s.table} class="stat bg-base-100 border border-base-300 rounded-box p-4 hover:border-primary/30 hover:shadow-md transition-all no-underline">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">{ICONS[s.name] || "📊"}</div>
            <div>
              <div class="stat-value text-2xl font-bold text-base-content">{s.count}</div>
              <div class="stat-title text-xs opacity-50 mt-0.5">{s.count === 1 ? s.name : s.plural}</div>
            </div>
          </div>
        </a>
      ))}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div class="lg:col-span-2 card bg-base-100 border border-base-300">
        <div class="card-body">
          <div class="flex items-center justify-between mb-3">
            <h3 class="card-title text-sm">Records Overview</h3>
            <span class="text-xs opacity-40">Last 30 days</span>
          </div>
          <Bar stats={stats} />
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <h3 class="card-title text-sm mb-3">Quick Actions</h3>
          <div class="flex flex-col gap-2">
            {models?.map(m => (
              <a href={"/admin/" + m.tableName + "/new"} class="btn btn-primary btn-sm justify-start gap-2">
                <span class="text-base">{ICONS[m.name] || "📄"}</span>
                New {m.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>

    {recent.length > 0 && (
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <div class="flex items-center justify-between mb-3">
            <h3 class="card-title text-sm">Recent Activity</h3>
            <span class="text-xs opacity-40">{recent.length} entries</span>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th class="text-xs opacity-50 uppercase tracking-wider">Model</th>
                  <th class="text-xs opacity-50 uppercase tracking-wider">Title</th>
                  <th class="text-xs opacity-50 uppercase tracking-wider">Time</th>
                  <th class="text-xs opacity-50 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr class="hover:bg-base-200 transition-colors">
                    <td><span class="badge badge-soft badge-primary badge-sm">{ICONS[r.model] || ""} {r.model}</span></td>
                    <td class="text-sm font-medium">
                      <a href={"/admin/" + r.model.toLowerCase() + "s" + (r.id ? "/" + r.id + "/edit" : "")} class="no-underline hover:text-primary">{r.title || "Untitled"}</a>
                    </td>
                    <td class="text-xs opacity-40">{r.time ? new Date(r.time).toLocaleDateString() : "-"}</td>
                    <td>
                      <a href={"/admin/" + r.model.toLowerCase() + "s" + (r.id ? "/" + r.id + "/edit" : "")} class="btn btn-ghost btn-xs">View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </Layout>
)
