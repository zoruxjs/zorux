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
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill="var(--primary,#3b82f6)" opacity="0.8" />
            <text x={x + barW / 2} y={h - 4} text-anchor="middle" font-size="11" fill="var(--muted,#666)">{s.name}</text>
            <text x={x + barW / 2} y={y - 6} text-anchor="middle" font-size="12" font-weight="bold" fill="var(--text,#111)">{s.count}</text>
          </g>
        )
      })}
    </svg>
  )
}

export const Dashboard: FC<DashboardProps> = ({ user, models, stats, recent }) => (
  <Layout title="Dashboard - Admin" user={user} models={models}>
    <div style="margin-bottom:1.5rem">
      <h1 style="margin:0">Dashboard</h1>
      <p class="text-muted" style="margin:0.25rem 0 0">Overview of your data</p>
    </div>

    <div class="flex flex-gap" style="flex-wrap:wrap;margin-bottom:1.5rem">
      {stats.map(s => (
        <a href={"/admin/" + s.table} class="card" style="flex:1;min-width:160px;text-decoration:none;color:var(--text);padding:1.25rem;text-align:center">
          <div style="font-size:2rem;font-weight:700;color:var(--primary,#3b82f6)">{s.count}</div>
          <div style="font-size:0.85rem;color:var(--muted,#666);margin-top:0.25rem">{s.count === 1 ? s.name : s.plural}</div>
        </a>
      ))}
    </div>

    <div class="flex flex-gap" style="flex-wrap:wrap">
      <div class="card" style="flex:2;min-width:300px">
        <div class="card-header"><h2>Records</h2></div>
        <BarChart stats={stats} />
      </div>

      <div class="card" style="flex:1;min-width:250px">
        <div class="card-header"><h2>Quick Actions</h2></div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;padding:1rem">
          {models?.map(m => (
            <a href={"/admin/" + m.tableName + "/new"} class="btn btn-primary btn-sm" style="text-align:center;text-decoration:none">+ New {m.name}</a>
          ))}
        </div>
      </div>
    </div>

    {recent.length > 0 && (
      <div class="card" style="margin-top:1.5rem">
        <div class="card-header"><h2>Recent Activity</h2></div>
        <div style="padding:0.5rem 1rem">
          {recent.map(r => (
            <div class="flex flex-gap" style="align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--border,#eee)">
              <span class="badge" style="background:var(--primary,#3b82f6);color:#fff;font-size:0.75rem;padding:2px 8px;border-radius:4px">{r.model}</span>
              <span style="flex:1">
                <a href={"/admin/" + r.model.toLowerCase() + "s" + (r.id ? "/" + r.id + "/edit" : "")} style="color:var(--text,#111);text-decoration:none">{r.title}</a>
              </span>
              <span class="text-muted" style="font-size:0.8rem">{r.time}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </Layout>
)
