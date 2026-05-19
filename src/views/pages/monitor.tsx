import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface MonitorProps { user?: any; models?: any[]; health: any; metrics: any }

export const MonitorPage: FC<MonitorProps> = ({ user, models, health, metrics }) => (
  <Layout title="System Monitor - Admin" user={user} models={models}>
    <h2 class="section-title">System Monitor</h2>
    <p class="section-desc">Health, metrics, and system status</p>

    <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
      <div class="stat-card">
        <div style="font-size:0.75rem;opacity:0.4;text-transform:uppercase;letter-spacing:0.03em">Status</div>
        <div style="font-size:1.25rem;font-weight:700;margin-top:0.375rem;color:var(--su)"><span class="stat-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--su);margin-right:0.375rem"></span>{health?.status || "unknown"}</div>
      </div>
      <div class="stat-card">
        <div style="font-size:0.75rem;opacity:0.4;text-transform:uppercase;letter-spacing:0.03em">Uptime</div>
        <div style="font-size:1.25rem;font-weight:700;margin-top:0.375rem">{Math.floor((health?.uptime || 0) / 60)}m</div>
      </div>
      <div class="stat-card">
        <div style="font-size:0.75rem;opacity:0.4;text-transform:uppercase;letter-spacing:0.03em">Database</div>
        <div style="font-size:1.25rem;font-weight:700;margin-top:0.375rem;color:var(--su)"><span class="stat-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--su);margin-right:0.375rem"></span>{health?.checks?.database?.status || "checking"}</div>
      </div>
    </div>

    <div class="dash-row">
      <div class="card" style="flex:1;min-width:280px;background:var(--b1);border:1px solid color-mix(in oklch, var(--bc) 8%, transparent);border-radius:var(--radius-box);padding:1.25rem">
        <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.75rem">Models</h3>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead><tr><th class="text-xs opacity-50 uppercase tracking-wider">Model</th><th class="text-xs opacity-50 uppercase tracking-wider" style="text-align:right">Records</th></tr></thead>
            <tbody>
              {metrics?.models && Object.entries(metrics.models).map(([name, count]) => (
                <tr><td class="text-sm">{name}</td><td class="text-sm font-mono" style="text-align:right">{String(count)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card" style="flex:1;min-width:280px;background:var(--b1);border:1px solid color-mix(in oklch, var(--bc) 8%, transparent);border-radius:var(--radius-box);padding:1.25rem">
        <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.75rem">System</h3>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <tbody>
              <tr><td class="text-sm">Organizations</td><td class="text-sm font-mono" style="text-align:right">{metrics?.organizations ?? <span class="opacity-40">-</span>}</td></tr>
              <tr><td class="text-sm">Members</td><td class="text-sm font-mono" style="text-align:right">{metrics?.members ?? <span class="opacity-40">-</span>}</td></tr>
              <tr><td class="text-sm">Notifications</td><td class="text-sm font-mono" style="text-align:right">{metrics?.notifications ?? <span class="opacity-40">-</span>}</td></tr>
              <tr><td class="text-sm">Sessions</td><td class="text-sm font-mono" style="text-align:right">{metrics?.sessions ?? <span class="opacity-40">-</span>}</td></tr>
              <tr><td class="text-sm">Jobs (pending)</td><td class="text-sm font-mono" style="text-align:right">{metrics?.jobs?.pending ?? <span class="opacity-40">-</span>}</td></tr>
              <tr><td class="text-sm">Jobs (failed)</td><td class="text-sm font-mono" style="text-align:right">{metrics?.jobs?.failed ?? <span class="opacity-40">-</span>}</td></tr>
              <tr><td class="text-sm">Jobs (completed)</td><td class="text-sm font-mono" style="text-align:right">{metrics?.jobs?.completed ?? <span class="opacity-40">-</span>}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Layout>
)
