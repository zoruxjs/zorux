import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface MonitorProps {
  user?: any
  models?: { tableName: string; name: string; plural: string }[]
  health: any
  metrics: any
}

export const MonitorPage: FC<MonitorProps> = ({ user, models, health, metrics }) => (
  <Layout title="Monitor - Admin" user={user} models={models}>
    <div style="margin-bottom:1.5rem">
      <h1 style="margin:0">System Monitor</h1>
      <p class="text-muted" style="margin:0.25rem 0 0">Health, metrics, and system status</p>
    </div>

    <div class="flex flex-gap" style="flex-wrap:wrap;margin-bottom:1.5rem">
      <div class="card" style="flex:1;min-width:200px;padding:1.25rem;text-align:center">
        <div style="font-size:1rem;color:var(--muted,#666)">Status</div>
        <div style={`font-size:1.5rem;font-weight:700;margin-top:0.5rem;${health?.status === "healthy" ? "color:#22c55e" : "color:#ef4444"}`}>
          {health?.status || "unknown"}
        </div>
      </div>
      <div class="card" style="flex:1;min-width:200px;padding:1.25rem;text-align:center">
        <div style="font-size:1rem;color:var(--muted,#666)">Uptime</div>
        <div style="font-size:1.5rem;font-weight:700;margin-top:0.5rem;color:var(--text,#111)">
          {Math.floor((health?.uptime || 0) / 60)}m
        </div>
      </div>
      <div class="card" style="flex:1;min-width:200px;padding:1.25rem;text-align:center">
        <div style="font-size:1rem;color:var(--muted,#666)">Database</div>
        <div style={`font-size:1.5rem;font-weight:700;margin-top:0.5rem;${health?.checks?.database?.status === "ok" ? "color:#22c55e" : "color:#ef4444"}`}>
          {health?.checks?.database?.status || "checking"}
        </div>
      </div>
    </div>

    <div class="flex flex-gap" style="flex-wrap:wrap">
      <div class="card" style="flex:1;min-width:300px">
        <div class="card-header"><h2>Models</h2></div>
        <div style="padding:1rem">
          <table style="width:100%">
            <thead><tr><th style="text-align:left">Model</th><th style="text-align:right">Records</th></tr></thead>
            <tbody>
              {metrics?.models && Object.entries(metrics.models).map(([name, count]) => (
                <tr><td style="padding:4px 0">{name}</td><td style="padding:4px 0;text-align:right">{String(count)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="flex:1;min-width:300px">
        <div class="card-header"><h2>System</h2></div>
        <div style="padding:1rem">
          <table style="width:100%">
            <tbody>
              <tr><td style="padding:4px 0">Organizations</td><td style="padding:4px 0;text-align:right">{metrics?.organizations ?? "-"}</td></tr>
              <tr><td style="padding:4px 0">Members</td><td style="padding:4px 0;text-align:right">{metrics?.members ?? "-"}</td></tr>
              <tr><td style="padding:4px 0">Notifications</td><td style="padding:4px 0;text-align:right">{metrics?.notifications ?? "-"}</td></tr>
              <tr><td style="padding:4px 0">Sessions</td><td style="padding:4px 0;text-align:right">{metrics?.sessions ?? "-"}</td></tr>
              <tr><td style="padding:4px 0">Jobs (pending)</td><td style="padding:4px 0;text-align:right">{metrics?.jobs?.pending ?? "-"}</td></tr>
              <tr><td style="padding:4px 0">Jobs (failed)</td><td style="padding:4px 0;text-align:right">{metrics?.jobs?.failed ?? "-"}</td></tr>
              <tr><td style="padding:4px 0">Jobs (completed)</td><td style="padding:4px 0;text-align:right">{metrics?.jobs?.completed ?? "-"}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Layout>
)
