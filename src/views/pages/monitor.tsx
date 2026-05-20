import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface MonitorProps { user?: any; models?: any[]; health: any; metrics: any; active?: string }

export const MonitorPage: FC<MonitorProps> = ({ user, models, health, metrics, active }) => (
  <Layout title="System Monitor" user={user} models={models} active={active}>
    <div class="mb-4">
      <h2 class="text-xl font-bold tracking-tight">System Monitor</h2>
      <p class="text-sm opacity-40 mt-0.5">Health, metrics, and system status</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="stat bg-base-100 border border-base-300 rounded-box p-4">
        <div class="flex items-center gap-3">
          <div class={"w-10 h-10 rounded-lg flex items-center justify-center text-lg " + (health?.status === "healthy" ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
            <span class={"status " + (health?.status === "healthy" ? "status-success" : "status-error")}></span>
          </div>
          <div>
            <div class="stat-title text-xs opacity-50">Status</div>
            <div class="stat-value text-lg font-bold">{health?.status || "unknown"}</div>
          </div>
        </div>
      </div>
      <div class="stat bg-base-100 border border-base-300 rounded-box p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-info/10 text-info flex items-center justify-center text-lg">⏱️</div>
          <div>
            <div class="stat-title text-xs opacity-50">Uptime</div>
            <div class="stat-value text-lg font-bold">{Math.floor((health?.uptime || 0) / 60)}m</div>
          </div>
        </div>
      </div>
      <div class="stat bg-base-100 border border-base-300 rounded-box p-4">
        <div class="flex items-center gap-3">
          <div class={"w-10 h-10 rounded-lg flex items-center justify-center text-lg " + (health?.checks?.database?.status === "ok" ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
            <span class={"status " + (health?.checks?.database?.status === "ok" ? "status-success" : "status-error")}></span>
          </div>
          <div>
            <div class="stat-title text-xs opacity-50">Database</div>
            <div class="stat-value text-lg font-bold">{health?.checks?.database?.status || "checking"}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <h3 class="card-title text-sm mb-3">Models</h3>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr><th class="text-xs opacity-50 uppercase">Model</th><th class="text-xs opacity-50 uppercase text-right">Records</th></tr>
              </thead>
              <tbody>
                {metrics?.models && Object.entries(metrics.models).map(([name, count]) => (
                  <tr class="hover:bg-base-200 transition-colors">
                    <td class="text-sm">{name}</td>
                    <td class="text-sm font-mono text-right">{String(count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <h3 class="card-title text-sm mb-3">System</h3>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <tbody>
                {[
                  ["Organizations", metrics?.organizations],
                  ["Members", metrics?.members],
                  ["Notifications", metrics?.notifications],
                  ["Sessions", metrics?.sessions],
                  ["Jobs (pending)", metrics?.jobs?.pending],
                  ["Jobs (failed)", metrics?.jobs?.failed],
                  ["Jobs (completed)", metrics?.jobs?.completed],
                ].map(([label, value]) => (
                  <tr class="hover:bg-base-200 transition-colors">
                    <td class="text-sm">{label}</td>
                    <td class="text-sm font-mono text-right">{value ?? <span class="opacity-40">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </Layout>
)
