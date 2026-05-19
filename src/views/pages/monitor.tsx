import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface MonitorProps {
  user?: any
  models?: { tableName: string; name: string; plural: string }[]
  health: any
  metrics: any
}

export const MonitorPage: FC<MonitorProps> = ({ user, models, health, metrics }) => (
  <Layout title="System Monitor - Admin" user={user} models={models}>
    <div style="margin-bottom:1rem">
      <h2 style="margin:0;font-size:1.25rem">System Monitor</h2>
      <p class="text-muted text-sm" style="margin:0.25rem 0 0">Health, metrics, and system status</p>
    </div>

    <div class="flex flex-gap flex-wrap" style="margin-bottom:1.5rem">
      <div class="metric-card">
        <div class="metric-label">Status</div>
        <div class={"metric-value " + (health?.status === "healthy" ? "metric-success" : "metric-danger")}>
          <span class={"status-dot " + (health?.status === "healthy" ? "ok" : "err")}></span>
          {health?.status || "unknown"}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Uptime</div>
        <div class="metric-value metric-primary">{Math.floor((health?.uptime || 0) / 60)}m</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Database</div>
        <div class={"metric-value " + (health?.checks?.database?.status === "ok" ? "metric-success" : "metric-danger")}>
          <span class={"status-dot " + (health?.checks?.database?.status === "ok" ? "ok" : "err")}></span>
          {health?.checks?.database?.status || "checking"}
        </div>
      </div>
    </div>

    <div class="flex flex-gap flex-wrap">
      <div class="card" style="flex:1;min-width:300px">
        <div class="card-header"><h2>Models</h2></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Model</th><th style="text-align:right">Records</th></tr></thead>
            <tbody>
              {metrics?.models && Object.entries(metrics.models).map(([name, count]) => (
                <tr><td>{name}</td><td style="text-align:right;font-family:var(--font-mono)">{String(count)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="flex:1;min-width:300px">
        <div class="card-header"><h2>System</h2></div>
        <div class="table-wrap">
          <table>
            <tbody>
              <tr><td>Organizations</td><td style="text-align:right;font-family:var(--font-mono)">{metrics?.organizations ?? <span class="text-muted">-</span>}</td></tr>
              <tr><td>Members</td><td style="text-align:right;font-family:var(--font-mono)">{metrics?.members ?? <span class="text-muted">-</span>}</td></tr>
              <tr><td>Notifications</td><td style="text-align:right;font-family:var(--font-mono)">{metrics?.notifications ?? <span class="text-muted">-</span>}</td></tr>
              <tr><td>Sessions</td><td style="text-align:right;font-family:var(--font-mono)">{metrics?.sessions ?? <span class="text-muted">-</span>}</td></tr>
              <tr><td>Jobs (pending)</td><td style="text-align:right;font-family:var(--font-mono)">{metrics?.jobs?.pending ?? <span class="text-muted">-</span>}</td></tr>
              <tr><td>Jobs (failed)</td><td style="text-align:right;font-family:var(--font-mono)">{metrics?.jobs?.failed ?? <span class="text-muted">-</span>}</td></tr>
              <tr><td>Jobs (completed)</td><td style="text-align:right;font-family:var(--font-mono)">{metrics?.jobs?.completed ?? <span class="text-muted">-</span>}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Layout>
)
