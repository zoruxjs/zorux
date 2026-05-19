import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface Stat { name: string; table: string; count: number; plural: string }
interface Recent { model: string; id: any; title: string; time: string }

interface DashboardProps {
  user?: any
  models?: { tableName: string; name: string; plural: string }[]
  stats: Stat[]
  recent: Recent[]
}

function BarChart({ stats }: { stats: Stat[] }) {
  const max = Math.max(...stats.map(s => s.count), 1)
  const barW = Math.max(40, Math.min(80, 600 / stats.length - 16))
  const h = 160

  return (
    <svg viewBox={"0 0 " + Math.max(300, stats.length * (barW + 16) + 32) + " " + (h + 30)} style="width:100%;max-width:700px;height:auto">
      {stats.map((s, i) => {
        const x = 16 + i * (barW + 16)
        const barH = (s.count / max) * (h - 20)
        const y = h - barH
        return (
          <g>
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill="var(--primary)" opacity="0.85" />
            <text x={x + barW / 2} y={h - 4} text-anchor="middle" font-size="11" fill="var(--text-muted)">{s.name}</text>
            <text x={x + barW / 2} y={y - 6} text-anchor="middle" font-size="12" font-weight="bold" fill="var(--text)">{s.count}</text>
          </g>
        )
      })}
    </svg>
  )
}

export const Dashboard: FC<DashboardProps> = ({ user, models, stats, recent }) => (
  <Layout title="Dashboard - Admin" user={user} models={models}>
    <div class="dashboard-grid">
      {stats.map(s => (
        <a href={"/admin/" + s.table} class="stat-card">
          <div class="stat-value">{s.count}</div>
          <div class="stat-label">{s.count === 1 ? s.name : s.plural}</div>
        </a>
      ))}
    </div>

    <div class="flex flex-gap flex-wrap" style="margin-bottom:1.5rem">
      <div class="card chart-card">
        <div class="card-header"><h2>Records</h2></div>
        <BarChart stats={stats} />
      </div>

      <div class="card actions-card">
        <div class="card-header"><h2>Quick Actions</h2></div>
        <div class="btn-group" style="flex-direction:column">
          {models?.map(m => (
            <a href={"/admin/" + m.tableName + "/new"} class="btn btn-primary btn-sm" style="justify-content:center">+ New {m.name}</a>
          ))}
        </div>
      </div>
    </div>

    {recent.length > 0 && (
      <div class="card" style="margin-top:1.5rem">
        <div class="card-header"><h2>Recent Activity</h2></div>
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
