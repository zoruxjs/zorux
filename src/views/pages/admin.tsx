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
  if (type === "bool") return val ? <span class="badge badge-success badge-xs">true</span> : <span class="badge badge-error badge-soft badge-xs">false</span>
  if (type === "file") {
    if (!val) return <span class="opacity-40 text-xs">-</span>
    if (typeof val === "string" && val.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) return <img src={val} style="max-width:48px;max-height:32px;border-radius:6px;object-fit:cover" />
    const safeUrl = typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/uploads/")) ? val : ""
    return safeUrl ? <a href={safeUrl} target="_blank" class="link link-primary text-sm">Download</a> : <span class="opacity-40 text-xs">file</span>
  }
  if (type === "richtext") {
    if (!val) return <span class="opacity-40 text-xs">-</span>
    const stripped = typeof val === "string" ? val.replace(/<[^>]*>/g, "").trim() : String(val)
    return stripped.length > 60 ? stripped.slice(0, 60) + "…" : stripped
  }
  if (val === null || val === undefined) return <span class="opacity-40 text-xs">-</span>
  return String(val).length > 60 ? String(val).slice(0, 60) + "…" : String(val)
}

export const AdminList: FC<AdminListProps> = ({ modelName, modelPlural, fields, rows, user, models, search, sort, order, page, totalPages, basePath, active }) => {
  const currentSort = sort || "id"
  const currentOrder = order || "asc"
  const currentSearch = search || ""
  const currentPage = page || 1
  const path = basePath || "/admin/" + modelPlural

  function toggleSort(f: string) { return currentSort === f ? (currentOrder === "asc" ? "desc" : "asc") : "asc" }
  function icon(f: string) { return currentSort !== f ? "" : currentOrder === "asc" ? " ↑" : " ↓" }

  const delId = "del-" + modelPlural

  const headers = [
    <a href={path + qs({ search: currentSearch, sort: "id", order: toggleSort("id"), page: "1" })}>ID{icon("id")}</a>,
    ...fields.map(f => <a href={path + qs({ search: currentSearch, sort: f.name, order: toggleSort(f.name), page: "1" })}>{f.name}{icon(f.name)}</a>),
    "Actions",
  ]

  const data = rows.map((row: any) => [
    <span class="font-mono text-xs opacity-60">{row.id}</span>,
    ...fields.map(f => cell(row[f.name], f.type)),
    <div class="join">
      <a href={"/admin/" + modelPlural + "/" + row.id + "/edit"} class="join-item btn btn-soft btn-primary btn-xs">Edit</a>
      <button class="join-item btn btn-soft btn-error btn-xs" onclick={"document.getElementById('" + delId + row.id + "').showModal()"}>Delete</button>
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
    </div>,
  ])

  return (
    <Layout title={modelName + " - Admin"} user={user} models={models} active={active}>
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold">{modelPlural}</h2>
          <p class="text-sm opacity-40">{rows.length} records</p>
        </div>
        <a href={"/admin/" + modelPlural + "/new"} class="btn btn-primary">+ New</a>
      </div>
      <div class="card card-border bg-base-100">
        <div class="card-body p-4">
          <form method="GET" action={path} class="flex gap-2 mb-3">
            <input type="text" name="search" placeholder="Search…" value={currentSearch} class="input flex-1" />
            <button type="submit" class="btn btn-primary btn-sm">Search</button>
            {currentSearch ? <a href={path} class="btn btn-soft btn-sm">Clear</a> : null}
            <input type="hidden" name="sort" value={currentSort} />
            <input type="hidden" name="order" value={currentOrder} />
          </form>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>{headers.map(h => <th class="text-xs opacity-50 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.map(row => <tr>{row.map(c => <td class="text-sm">{c}</td>)}</tr>)}
                {data.length === 0 && <tr><td colspan={headers.length} style="text-align:center;padding:3rem;opacity:0.4">No records</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages && totalPages > 1 ? (
            <div class="join mt-4 flex justify-center">
              {currentPage > 1
                ? <a href={path + qs({ search: currentSearch, sort: currentSort, order: currentOrder, page: String(currentPage - 1) })} class="join-item btn btn-soft btn-sm">←</a>
                : <span class="join-item btn btn-soft btn-sm btn-disabled">←</span>}
              <span class="join-item btn btn-soft btn-sm no-animation text-xs opacity-60">Page {currentPage} of {totalPages}</span>
              {currentPage < totalPages
                ? <a href={path + qs({ search: currentSearch, sort: currentSort, order: currentOrder, page: String(currentPage + 1) })} class="join-item btn btn-soft btn-sm">→</a>
                : <span class="join-item btn btn-soft btn-sm btn-disabled">→</span>}
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
    <Layout title={(isNew ? "New" : "Edit") + " " + modelName + " - Admin"} user={user} models={models} active={active}>
      <div class="mb-4">
        <a href={"/admin/" + modelPlural} class="text-sm opacity-50 no-underline hover:opacity-100">← Back to {modelPlural}</a>
        <h2 class="text-xl font-semibold mt-1">{isNew ? "New " + modelName : "Edit " + modelName}</h2>
      </div>
      <div class="card card-border bg-base-100">
        <div class="card-body p-6">
          {error && <div role="alert" class="alert alert-error text-sm mb-4"><span>{error}</span></div>}
          <form method="POST" action={"/admin/" + modelPlural + (isNew ? "" : "/" + values?.id)} enctype={hasFile ? "multipart/form-data" : undefined}>
            <div class="flex flex-col gap-3">
              {fields.map(f => {
                const isText = f.type === "text" || f.type === "content"
                const isNumber = f.type === "int" || f.type === "float"
                const isBool = f.type === "bool"
                const isFile = f.type === "file"
                const isRichtext = f.type === "richtext"
                return (
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-sm font-medium">{f.name}</legend>
                    {isRichtext ? (
                      <div>
                        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/trix@2/dist/trix.min.css" />
                        <script src="https://cdn.jsdelivr.net/npm/trix@2/dist/trix.umd.min.js"></script>
                        <input type="hidden" id={f.name} name={f.name} value={values?.[f.name] || ""} />
                        <trix-editor input={f.name} class="trix-editor" style="min-height:160px;border:1px solid color-mix(in oklch, var(--color-base-content) 12%, transparent);border-radius:var(--radius-field);padding:0.75rem;font-size:0.85rem"></trix-editor>
                      </div>
                    ) : isFile ? (
                      <div>
                        {values?.[f.name] && <div class="mb-2">{typeof values[f.name] === "string" && (values[f.name].match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? <img src={values[f.name]} style="max-width:160px;border-radius:var(--radius-field)" /> : <a href={values[f.name]} target="_blank" class="link link-primary text-sm">View file</a>)}</div>}
                        <input id={f.name} name={f.name} type="file" class="file-input file-input-soft file-input-sm w-full" />
                        <input type="hidden" name={"_existing_" + f.name} value={values?.[f.name] || ""} />
                      </div>
                    ) : isText ? (
                      <textarea id={f.name} name={f.name} required={f.required} class="textarea w-full" placeholder={f.name}>{values?.[f.name] || ""}</textarea>
                    ) : isBool ? (
                      <select id={f.name} name={f.name} class="select w-full">
                        <option value="true" selected={values?.[f.name] === true}>true</option>
                        <option value="false" selected={values?.[f.name] === false || values?.[f.name] === undefined}>false</option>
                      </select>
                    ) : (
                      <input id={f.name} name={f.name} type={isNumber ? "number" : "text"} value={values?.[f.name] || ""} required={f.required} class="input w-full" placeholder={f.name} />
                    )}
                  </fieldset>
                )
              })}
            </div>
            <div class="flex gap-2 mt-4">
              <button type="submit" class="btn btn-primary">{isNew ? "Create" : "Save"}</button>
              <a href={"/admin/" + modelPlural} class="btn btn-soft">Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
