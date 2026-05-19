import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface Feature { id: number; key: string; name: string; description: string; enabled: number; created_at: string }
interface FeaturePageProps { user?: any; models?: any[]; features: Feature[]; active?: string }

export const FeaturePage: FC<FeaturePageProps> = ({ user, models, features, active }) => (
  <Layout title="Feature Flags - Admin" user={user} models={models} active={active}>
    <h2 class="section-title">Feature Flags</h2>
    <p class="section-desc">Toggle features on/off without deploying</p>

    <div class="card" style="background:var(--b1);border:1px solid color-mix(in oklch, var(--bc) 8%, transparent);border-radius:var(--radius-box);padding:1rem">
      {features.length === 0 ? (
        <div style="text-align:center;padding:2rem;opacity:0.4">
          <p>No feature flags created yet.</p>
          <p class="text-sm">Create one below or via the API.</p>
        </div>
      ) : (
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr><th class="text-xs opacity-50 uppercase tracking-wider">Flag</th><th class="text-xs opacity-50 uppercase tracking-wider">Description</th><th class="text-xs opacity-50 uppercase tracking-wider" style="text-align:center">Status</th><th class="text-xs opacity-50 uppercase tracking-wider" style="text-align:center">Actions</th></tr>
            </thead>
            <tbody>
              {features.map(f => (
                <tr>
                  <td class="text-sm"><strong>{f.name}</strong><div class="text-xs font-mono opacity-40">{f.key}</div></td>
                  <td class="text-sm">{f.description || <span class="opacity-40">-</span>}</td>
                  <td style="text-align:center">{f.enabled ? <span class="badge badge-success badge-xs">ON</span> : <span class="badge badge-soft badge-xs">OFF</span>}</td>
                  <td style="text-align:center">
                    <div class="flex gap-2" style="justify-content:center">
                      <form method="POST" action={"/admin/features/" + f.key + "/toggle"} style="display:inline" data-turbo="false">
                        <button class="btn btn-xs" style={f.enabled ? "" : "background:var(--su);color:var(--suc);border:none"}>{f.enabled ? "Disable" : "Enable"}</button>
                      </form>
                      <form method="POST" action={"/admin/features/" + f.key + "/delete"} style="display:inline" data-turbo="false">
                        <button class="btn btn-soft btn-error btn-xs">Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    <div class="card" style="margin-top:1.5rem;background:var(--b1);border:1px solid color-mix(in oklch, var(--bc) 8%, transparent);border-radius:var(--radius-box);padding:1.25rem">
      <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:1rem">Create New Flag</h3>
      <form method="POST" action="/admin/features/create" data-turbo="false">
        <div class="flex flex-wrap gap-3" style="align-items:end">
          <div style="flex:1;min-width:180px">
            <label class="label" style="font-size:0.8rem;font-weight:500;margin-bottom:0.25rem">Key</label>
            <input type="text" name="key" placeholder="new-feature" required class="input" style="width:100%;padding:0.5rem 0.75rem;border:1px solid color-mix(in oklch, var(--bc) 12%, transparent);border-radius:var(--radius-field);background:var(--b2);font-size:0.85rem" />
          </div>
          <div style="flex:1;min-width:180px">
            <label class="label" style="font-size:0.8rem;font-weight:500;margin-bottom:0.25rem">Name</label>
            <input type="text" name="name" placeholder="New Feature" required class="input" style="width:100%;padding:0.5rem 0.75rem;border:1px solid color-mix(in oklch, var(--bc) 12%, transparent);border-radius:var(--radius-field);background:var(--b2);font-size:0.85rem" />
          </div>
          <div style="flex:1;min-width:180px">
            <label class="label" style="font-size:0.8rem;font-weight:500;margin-bottom:0.25rem">Description</label>
            <input type="text" name="description" placeholder="Describe this feature" class="input" style="width:100%;padding:0.5rem 0.75rem;border:1px solid color-mix(in oklch, var(--bc) 12%, transparent);border-radius:var(--radius-field);background:var(--b2);font-size:0.85rem" />
          </div>
          <button type="submit" class="btn btn-primary" style="align-self:flex-end">Create</button>
        </div>
      </form>
    </div>
  </Layout>
)
