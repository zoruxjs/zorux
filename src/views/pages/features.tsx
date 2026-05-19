import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface Feature {
  id: number
  key: string
  name: string
  description: string
  enabled: number
  created_at: string
}

interface FeaturePageProps {
  user?: any
  models?: { tableName: string }[]
  features: Feature[]
}

export const FeaturePage: FC<FeaturePageProps> = ({ user, models, features }) => (
  <Layout title="Feature Flags - Admin" user={user} models={models}>
    <div style="margin-bottom:1.5rem">
      <div class="flex flex-gap" style="align-items:center;justify-content:space-between">
        <div>
          <h1 style="margin:0">Feature Flags</h1>
          <p class="text-muted" style="margin:0.25rem 0 0">Toggle features on/off without deploying</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="padding:1rem">
        {features.length === 0 ? (
          <div style="text-align:center;padding:2rem;color:var(--muted,#666)">
            <p>No feature flags created yet.</p>
            <p class="text-sm">Flags can be managed via the API or created below.</p>
          </div>
        ) : (
          <table style="width:100%">
            <thead>
              <tr>
                <th style="text-align:left">Flag</th>
                <th style="text-align:left">Description</th>
                <th style="text-align:center">Status</th>
                <th style="text-align:center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {features.map(f => (
                <tr>
                  <td style="padding:8px 0">
                    <strong>{f.name}</strong>
                    <div class="text-muted" style="font-size:0.8rem">{f.key}</div>
                  </td>
                  <td style="padding:8px 0">{f.description || "-"}</td>
                  <td style="padding:8px 0;text-align:center">
                    {f.enabled ? <span class="badge badge-success" style="background:#22c55e;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.8rem">ON</span> : <span class="badge" style="background:#64748b;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.8rem">OFF</span>}
                  </td>
                  <td style="padding:8px 0;text-align:center">
                    <form method="POST" action={"/admin/features/" + f.key + "/toggle"} style="display:inline" data-turbo="false">
                      <button class="btn btn-sm" style={f.enabled ? "background:#64748b;color:#fff" : "background:#22c55e;color:#fff"}>{f.enabled ? "Disable" : "Enable"}</button>
                    </form>
                    <form method="POST" action={"/admin/features/" + f.key + "/delete"} style="display:inline" data-turbo="false">
                      <button class="btn btn-sm btn-danger">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>

    <div class="card" style="margin-top:1.5rem">
      <div class="card-header"><h2>Create New Flag</h2></div>
      <form method="POST" action="/admin/features/create" style="padding:1rem" data-turbo="false">
        <div class="flex flex-gap" style="flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <label for="key" class="text-sm">Key</label>
            <input type="text" id="key" name="key" placeholder="new-feature" class="input" required />
          </div>
          <div style="flex:1;min-width:200px">
            <label for="name" class="text-sm">Name</label>
            <input type="text" id="name" name="name" placeholder="New Feature" class="input" required />
          </div>
          <div style="flex:1;min-width:200px">
            <label for="description" class="text-sm">Description</label>
            <input type="text" id="description" name="description" placeholder="Describe this feature" class="input" />
          </div>
          <div style="display:flex;align-items:flex-end">
            <button type="submit" class="btn btn-primary">Create</button>
          </div>
        </div>
      </form>
    </div>
  </Layout>
)
