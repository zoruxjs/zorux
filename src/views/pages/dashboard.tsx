import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface Stat { name: string; table: string; count: number; plural: string }
interface Recent { model: string; id: any; title: string; time: string }
interface DashboardProps { user?: any; models?: any[]; stats: Stat[]; recent: Recent[] }

function Bar({ stats }: { stats: Stat[] }) {
  const max = Math.max(...stats.map(s => s.count), 1)
  const bw = Math.max(36, Math.min(72, 500 / stats.length - 12))
  const h = 150
  return (
    <svg viewBox={"0 0 " + Math.max(280, stats.length * (bw + 12) + 24) + " " + (h + 24)} style="width:100%;max-width:600px;height:auto">
      {stats.map((s, i) => {
        const x = 12 + i * (bw + 12)
        const bh = (s.count / max) * (h - 16)
        const y = h - bh
        return (
          <g>
            <rect x={x} y={y} width={bw} height={bh} rx="4" fill="var(--p)" opacity="0.85" />
            <text x={x + bw / 2} y={h - 4} text-anchor="middle" font-size="10" opacity="0.4" fill="var(--bc)">{s.name}</text>
            <text x={x + bw / 2} y={y - 6} text-anchor="middle" font-size="11" font-weight="600" fill="var(--bc)">{s.count}</text>
          </g>
        )
      })}
    </svg>
  )
}

export const Dashboard: FC<DashboardProps> = ({ user, models, stats, recent }) => (
  <Layout title="Dashboard - Admin" user={user} models={models}>
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
