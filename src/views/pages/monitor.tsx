import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface MonitorProps { user?: any; models?: any[]; health: any; metrics: any; active?: string }

export const MonitorPage: FC<MonitorProps> = ({ user, models, health, metrics, active }) => (
  <Layout title="System Monitor - Admin" user={user} models={models} active={active}>
    <div class="mb-4">
      <h2 class="text-xl font-semibold">System Monitor</h2>
      <p class="text-sm opacity-40">Health, metrics, and system status</p>
    </div>

    <div class="stats shadow flex-wrap w-full mb-6">
      <div class="stat">
        <div class="stat-title">Status</div>
        <div class="stat-value text-lg flex items-center gap-2">
          <span class={"status " + (health?.status === "healthy" ? "status-success" : "status-error")}></span>
          {health?.status || "unknown"}
        </div>
      </div>
      <div class="stat">
        <div class="stat-title">Uptime</div>
        <div class="stat-value text-lg">{Math.floor((health?.uptime || 0) / 60)}m</div>
      </div>
      <div class="stat">
        <div class="stat-title">Database</div>
        <div class="stat-value text-lg flex items-center gap-2">
          <span class={"status " + (health?.checks?.database?.status === "ok" ? "status-success" : "status-error")}></span>
          {health?.checks?.database?.status || "checking"}
        </div>
      </div>
    </div>

    <div class="flex gap-4 flex-wrap">
      <div class="card card-border bg-base-100 flex-1 min-w-[280px]">
        <div class="card-body">
          <h3 class="card-title text-sm">Models</h3>
          <div class="overflow-x-auto mt-2">
            <table class="table table-sm">
              <thead><tr><th class="text-xs opacity-50 uppercase">Model</th><th class="text-xs opacity-50 uppercase text-right">Records</th></tr></thead>
              <tbody>
                {metrics?.models && Object.entries(metrics.models).map(([name, count]) => (
                  <tr><td class="text-sm">{name}</td><td class="text-sm font-mono text-right">{String(count)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="card card-border bg-base-100 flex-1 min-w-[280px]">
        <div class="card-body">
          <h3 class="card-title text-sm">System</h3>
          <div class="overflow-x-auto mt-2">
            <table class="table table-sm">
              <tbody>
                <tr><td class="text-sm">Organizations</td><td class="text-sm font-mono text-right">{metrics?.organizations ?? <span class="opacity-40">-</span>}</td></tr>
                <tr><td class="text-sm">Members</td><td class="text-sm font-mono text-right">{metrics?.members ?? <span class="opacity-40">-</span>}</td></tr>
                <tr><td class="text-sm">Notifications</td><td class="text-sm font-mono text-right">{metrics?.notifications ?? <span class="opacity-40">-</span>}</td></tr>
                <tr><td class="text-sm">Sessions</td><td class="text-sm font-mono text-right">{metrics?.sessions ?? <span class="opacity-40">-</span>}</td></tr>
                <tr><td class="text-sm">Jobs (pending)</td><td class="text-sm font-mono text-right">{metrics?.jobs?.pending ?? <span class="opacity-40">-</span>}</td></tr>
                <tr><td class="text-sm">Jobs (failed)</td><td class="text-sm font-mono text-right">{metrics?.jobs?.failed ?? <span class="opacity-40">-</span>}</td></tr>
                <tr><td class="text-sm">Jobs (completed)</td><td class="text-sm font-mono text-right">{metrics?.jobs?.completed ?? <span class="opacity-40">-</span>}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </Layout>
)
