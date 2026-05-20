import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface Feature { id: number; key: string; name: string; description: string; enabled: number; created_at: string }
interface FeaturePageProps { user?: any; models?: any[]; features: Feature[]; active?: string }

export const FeaturePage: FC<FeaturePageProps> = ({ user, models, features, active }) => (
  <Layout title="Feature Flags - Admin" user={user} models={models} active={active}>
    <div class="mb-4">
      <h2 class="text-xl font-semibold">Feature Flags</h2>
      <p class="text-sm opacity-40">Toggle features on/off without deploying</p>
    </div>

    <div class="card card-border bg-base-100">
      <div class="card-body p-4">
        {features.length === 0 ? (
          <div class="text-center py-8 opacity-40">
            <p>No feature flags created yet.</p>
            <p class="text-sm mt-1">Create one below or via the API.</p>
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr><th class="text-xs opacity-50 uppercase tracking-wider">Flag</th><th class="text-xs opacity-50 uppercase tracking-wider">Description</th><th class="text-xs opacity-50 uppercase tracking-wider">Status</th><th class="text-xs opacity-50 uppercase tracking-wider">Actions</th></tr>
              </thead>
              <tbody>
                {features.map(f => (
                  <tr>
                    <td class="text-sm"><span class="font-medium">{f.name}</span><div class="text-xs font-mono opacity-40">{f.key}</div></td>
                    <td class="text-sm">{f.description || <span class="opacity-40">-</span>}</td>
                    <td>
                      <form method="POST" action={"/admin/features/" + f.key + "/toggle"} data-turbo="false">
                        <input type="checkbox" class={"toggle toggle-sm " + (f.enabled ? "toggle-primary" : "")} checked={!!f.enabled} onChange="this.form.submit()" />
                      </form>
                    </td>
                    <td>
                      <form method="POST" action={"/admin/features/" + f.key + "/delete"} data-turbo="false">
                        <button class="btn btn-soft btn-error btn-xs">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    <div class="card card-border bg-base-100 mt-4">
      <div class="card-body p-5">
        <h3 class="card-title text-sm mb-3">Create New Flag</h3>
        <form method="POST" action="/admin/features/create" data-turbo="false">
          <div class="flex flex-wrap gap-3 items-end">
            <fieldset class="fieldset flex-1 min-w-[160px]">
              <legend class="fieldset-legend text-xs">Key</legend>
              <input type="text" name="key" placeholder="new-feature" required class="input w-full" />
            </fieldset>
            <fieldset class="fieldset flex-1 min-w-[160px]">
              <legend class="fieldset-legend text-xs">Name</legend>
              <input type="text" name="name" placeholder="New Feature" required class="input w-full" />
            </fieldset>
            <fieldset class="fieldset flex-1 min-w-[160px]">
              <legend class="fieldset-legend text-xs">Description</legend>
              <input type="text" name="description" placeholder="Describe this feature" class="input w-full" />
            </fieldset>
            <button type="submit" class="btn btn-primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  </Layout>
)
