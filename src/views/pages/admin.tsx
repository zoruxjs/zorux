import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"

interface AdminListProps {
  modelName: string
  modelPlural: string
  fields: { name: string; type: string }[]
  rows: any[]
  user?: any
  models?: { tableName: string; name: string; plural: string }[]
  search?: string
  sort?: string
  order?: string
  page?: number
  totalPages?: number
  basePath?: string
  active?: string
}

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
  return parts.length > 0 ? "?" + parts.map(([k, v]) => k + "=" + encodeURIComponent(v!)).join("&") : ""
}

function cell(val: any, type: string) {
  if (type === "bool") return val
    ? <span class="badge badge-success badge-xs">true</span>
    : <span class="badge badge-soft badge-error badge-xs">false</span>
  if (type === "file") {
    if (!val) return <span class="opacity-40 text-xs">—</span>
    if (typeof val === "string" && val.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i))
      return <img src={val} class="w-10 h-8 rounded object-cover" />
    const safeUrl = typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/uploads/")) ? val : ""
    return safeUrl ? <a href={safeUrl} target="_blank" class="link link-primary text-xs">Download</a> : <span class="opacity-40 text-xs">file</span>
  }
  if (type === "richtext") {
    if (!val) return <span class="opacity-40 text-xs">—</span>
    const stripped = typeof val === "string" ? val.replace(/<[^>]*>/g, "").trim() : String(val)
    return <span class="text-sm">{stripped.length > 60 ? stripped.slice(0, 60) + "…" : stripped}</span>
  }
  if (val === null || val === undefined) return <span class="opacity-40 text-xs">—</span>
  const s = String(val)
  return <span class="text-sm">{s.length > 60 ? s.slice(0, 60) + "…" : s}</span>
}

export const AdminList: FC<AdminListProps> = ({ modelName, modelPlural, fields, rows, user, models, search, sort, order, page, totalPages, basePath, active }) => {
  const cs = sort || "id"
  const co = order || "asc"
  const cq = search || ""
  const cp = page || 1
  const path = basePath || "/admin/" + modelPlural
  const delId = "del-" + modelPlural

  function ts(f: string) { return cs === f ? (co === "asc" ? "desc" : "asc") : "asc" }
  function ic(f: string) { return cs !== f ? "" : co === "asc" ? " ↑" : " ↓" }

  const headers = [
    <a href={path + qs({ search: cq, sort: "id", order: ts("id"), page: "1" })} class="text-xs opacity-50 uppercase tracking-wider no-underline hover:opacity-100">ID{ic("id")}</a>,
    ...fields.map(f => (
      <a href={path + qs({ search: cq, sort: f.name, order: ts(f.name), page: "1" })} class="text-xs opacity-50 uppercase tracking-wider no-underline hover:opacity-100">{f.name}{ic(f.name)}</a>
    )),
    <span class="text-xs opacity-50 uppercase tracking-wider">Actions</span>,
  ]

  return (
    <Layout title={modelName + " - Admin"} user={user} models={models} active={active}>
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-bold tracking-tight">{modelPlural}</h2>
          <p class="text-sm opacity-40 mt-0.5">{rows.length} record(s)</p>
        </div>
        <a href={"/admin/" + modelPlural + "/new"} class="btn btn-primary">+ New</a>
      </div>

      <div class="card bg-base-100 border border-base-300">
        <div class="card-body p-4">
          <form method="GET" action={path} class="flex gap-2 mb-3">
            <div class="join flex-1">
              <input type="text" name="search" placeholder="Search…" value={cq} class="input join-item flex-1" />
              <button type="submit" class="btn btn-primary join-item">Search</button>
              {cq ? <a href={path} class="btn btn-soft join-item">Clear</a> : null}
            </div>
            <input type="hidden" name="sort" value={cs} />
            <input type="hidden" name="order" value={co} />
          </form>

          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>{headers.map(h => <th>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr class="hover:bg-base-200 transition-colors">
                    <td class="font-mono text-xs opacity-40">{row.id}</td>
                    {fields.map(f => <td>{cell(row[f.name], f.type)}</td>)}
                    <td>
                      <div class="join">
                        <a href={"/admin/" + modelPlural + "/" + row.id + "/edit"} class="join-item btn btn-soft btn-primary btn-xs">Edit</a>
                        <button class="join-item btn btn-soft btn-error btn-xs" onclick={"document.getElementById('" + delId + row.id + "').showModal()"}>Delete</button>
                      </div>
                      <dialog id={delId + row.id} class="modal">
                        <div class="modal-box max-w-sm">
                          <h3 class="font-bold text-lg">Delete #{row.id}?</h3>
                          <p class="py-2 text-sm opacity-60">This action cannot be undone.</p>
                          <div class="modal-action">
                            <form method="dialog"><button class="btn btn-soft">Cancel</button></form>
                            <form method="POST" action={"/admin/" + modelPlural + "/" + row.id + "/delete"}>
                              <button class="btn btn-error">Delete</button>
                            </form>
                          </div>
                        </div>
                      </dialog>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colspan={headers.length} class="text-center py-12 opacity-40 text-sm">No records found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages && totalPages > 1 ? (
            <div class="flex items-center justify-center gap-2 mt-4">
              <div class="join">
                {cp > 1
                  ? <a href={path + qs({ search: cq, sort: cs, order: co, page: String(cp - 1) })} class="join-item btn btn-soft btn-sm">←</a>
                  : <span class="join-item btn btn-soft btn-sm btn-disabled">←</span>}
                <span class="join-item btn btn-soft btn-sm no-animation text-xs opacity-60">Page {cp} of {totalPages}</span>
                {cp < totalPages
                  ? <a href={path + qs({ search: cq, sort: cs, order: co, page: String(cp + 1) })} class="join-item btn btn-soft btn-sm">→</a>
                  : <span class="join-item btn btn-soft btn-sm btn-disabled">→</span>}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  )
}

interface AdminFormProps {
  modelName: string
  modelPlural: string
  fields: { name: string; type: string; required?: boolean }[]
  values?: any
  isNew: boolean
  error?: string
  user?: any
  models?: { tableName: string; name: string; plural: string }[]
  active?: string
}

export const AdminForm: FC<AdminFormProps> = ({ modelName, modelPlural, fields, values, isNew, error, user, models, active }) => {
  const hasFile = fields.some(f => f.type === "file" || f.type === "richtext")
  return (
    <Layout title={(isNew ? "New" : "Edit") + " " + modelName} user={user} models={models} active={active}>
      <div class="mb-4">
        <a href={"/admin/" + modelPlural} class="text-sm opacity-40 no-underline hover:opacity-80 flex items-center gap-1">← Back to {modelPlural}</a>
        <h2 class="text-xl font-bold tracking-tight mt-1">{isNew ? "New " + modelName : "Edit " + modelName}</h2>
      </div>

      <div class="card bg-base-100 border border-base-300">
        <div class="card-body p-6">
          {error && (
            <div role="alert" class="alert alert-error text-sm mb-4"><span>{error}</span></div>
          )}
          <form method="POST" action={"/admin/" + modelPlural + (isNew ? "" : "/" + values?.id)} enctype={hasFile ? "multipart/form-data" : undefined}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              {fields.map(f => {
                const isText = f.type === "text" || f.type === "content"
                const isNum = f.type === "int" || f.type === "float"
                const isBool = f.type === "bool"
                const isFile = f.type === "file"
                const isRich = f.type === "richtext"
                const fullWidth = isText || isRich || isBool
                return (
                  <fieldset class={"fieldset " + (fullWidth ? "md:col-span-2" : "")}>
                    <legend class="fieldset-legend text-sm font-medium">{f.name}</legend>
                    {isRich ? (
                      <div>
                        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/trix@2/dist/trix.min.css" />
                        <script src="https://cdn.jsdelivr.net/npm/trix@2/dist/trix.umd.min.js"></script>
                        <input type="hidden" id={f.name} name={f.name} value={values?.[f.name] || ""} />
                        <trix-editor input={f.name} class="trix-editor" style="min-height:160px;border:1px solid color-mix(in oklch, var(--color-base-content) 12%, transparent);border-radius:var(--radius-field);padding:0.75rem;font-size:0.85rem"></trix-editor>
                      </div>
                    ) : isFile ? (
                      <div>
                        {values?.[f.name] && (
                          <div class="mb-2">
                            {typeof values[f.name] === "string" && values[f.name].match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
                              ? <img src={values[f.name]} class="max-w-40 rounded-box" />
                              : <a href={values[f.name]} target="_blank" class="link link-primary text-sm">View file</a>}
                          </div>
                        )}
                        <input type="file" name={f.name} class="file-input file-input-soft w-full" />
                        <input type="hidden" name={"_existing_" + f.name} value={values?.[f.name] || ""} />
                      </div>
                    ) : isText ? (
                      <textarea name={f.name} class="textarea w-full" placeholder={f.name} required={f.required}>{values?.[f.name] || ""}</textarea>
                    ) : isBool ? (
                      <select name={f.name} class="select w-full">
                        <option value="true" selected={values?.[f.name] === true}>true</option>
                        <option value="false" selected={values?.[f.name] === false || values?.[f.name] === undefined}>false</option>
                      </select>
                    ) : (
                      <input type={isNum ? "number" : "text"} name={f.name} value={values?.[f.name] || ""} class="input w-full" placeholder={f.name} required={f.required} />
                    )}
                  </fieldset>
                )
              })}
            </div>
            <div class="flex gap-2 mt-6">
              <button type="submit" class="btn btn-primary">{isNew ? "Create" : "Save Changes"}</button>
              <a href={"/admin/" + modelPlural} class="btn btn-soft">Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
