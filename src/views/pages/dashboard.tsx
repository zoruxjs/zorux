import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface Stat { name: string; table: string; count: number; plural: string }
interface Recent { model: string; id: any; title: string; time: string }
interface DashboardProps { user?: any; models?: any[]; stats: Stat[]; recent: Recent[]; active?: string }

export const Dashboard: FC<DashboardProps> = ({ user, models, stats, recent, active }) => (
  <Layout title="Dashboard - Admin" user={user} models={models} active={active}>
    <div class="stats-grid">
      {stats.map(s => (
        <a href={"/admin/" + s.table} class="stat-card">
          <div class="stat-val">{s.count}</div>
          <div class="stat-lbl">{s.count === 1 ? s.name : s.plural}</div>
        </a>
      ))}
    </div>

    <div class="dash-row">
      <div class="card dash-chart" style="background:var(--b1);border:1px solid color-mix(in oklch, var(--bc) 8%, transparent);border-radius:var(--radius-box);padding:1.25rem">
        <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.75rem">Records</h3>
        <Bar stats={stats} />
      </div>
      <div class="card dash-actions" style="background:var(--b1);border:1px solid color-mix(in oklch, var(--bc) 8%, transparent);border-radius:var(--radius-box);padding:1.25rem">
        <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.75rem">Quick Actions</h3>
        <div class="flex flex-col gap-2">
          {models?.map(m => (
            <a href={"/admin/" + m.tableName + "/new"} class="btn btn-primary btn-sm">+ New {m.name}</a>
          ))}
        </div>
      </div>
    </div>

    {recent.length > 0 && (
      <div class="card" style="background:var(--b1);border:1px solid color-mix(in oklch, var(--bc) 8%, transparent);border-radius:var(--radius-box);padding:1.25rem">
        <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.75rem">Recent Activity</h3>
        {recent.map(r => (
          <div class="activity-item">
            <span class="activity-badge">{r.model}</span>
            <span class="activity-title">
              <a href={"/admin/" + r.model.toLowerCase() + "s" + (r.id ? "/" + r.id + "/edit" : "")}>{r.title}</a>
            </span>
            <span class="activity-time">{r.time}</span>
          </div>
        ))}
      </div>
    )}
  </Layout>
)
