import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface Stat { name: string; table: string; count: number; plural: string }
interface Recent { model: string; id: any; title: string; time: string }
interface DashboardProps { user?: any; models?: any[]; stats: Stat[]; recent: Recent[]; active?: string }

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
          <g key={s.name}>
            <rect x={x} y={y} width={bw} height={bh} rx="4" fill="var(--color-primary)" opacity="0.85" />
            <text x={x + bw / 2} y={h - 4} text-anchor="middle" font-size="10" opacity="0.4" fill="var(--color-base-content)">{s.name}</text>
            <text x={x + bw / 2} y={y - 6} text-anchor="middle" font-size="11" font-weight="600" fill="var(--color-base-content)">{s.count}</text>
          </g>
        )
      })}
    </svg>
  )
}

export const Dashboard: FC<DashboardProps> = ({ user, models, stats, recent, active }) => (
  <Layout title="Dashboard - Admin" user={user} models={models} active={active}>
    <div class="stats shadow flex-wrap w-full mb-6">
      {stats.map(s => (
        <a href={"/admin/" + s.table} class="stat hover:bg-base-200 transition-colors no-underline">
          <div class="stat-title">{s.count === 1 ? s.name : s.plural}</div>
          <div class="stat-value text-primary">{s.count}</div>
        </a>
      ))}
    </div>

    <div class="flex gap-4 flex-wrap mb-6">
      <div class="card card-border bg-base-100 flex-1 min-w-[300px]">
        <div class="card-body">
          <h3 class="card-title text-sm">Records</h3>
          <Bar stats={stats} />
        </div>
      </div>
      <div class="card card-border bg-base-100 flex-1 min-w-[220px]">
        <div class="card-body">
          <h3 class="card-title text-sm">Quick Actions</h3>
          <div class="flex flex-col gap-2 mt-2">
            {models?.map(m => (
              <a href={"/admin/" + m.tableName + "/new"} class="btn btn-primary btn-sm">+ New {m.name}</a>
            ))}
          </div>
        </div>
      </div>
    </div>

    {recent.length > 0 && (
      <div class="card card-border bg-base-100">
        <div class="card-body">
          <h3 class="card-title text-sm">Recent Activity</h3>
          <ul class="list mt-2">
            {recent.map(r => (
              <li class="list-row flex items-center gap-3">
                <span class="badge badge-primary badge-sm">{r.model}</span>
                <span class="flex-1 text-sm"><a href={"/admin/" + r.model.toLowerCase() + "s" + (r.id ? "/" + r.id + "/edit" : "")} class="no-underline hover:text-primary">{r.title}</a></span>
                <span class="text-xs opacity-40">{r.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
  </Layout>
)
