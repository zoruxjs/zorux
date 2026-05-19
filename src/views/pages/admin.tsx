import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"
import { Card, Table, Btn, FormField, Flash } from "../components/UI"
import { escapeHtml } from "../../core/security"

interface AdminListProps {
  modelName: string
  modelPlural: string
  fields: { name: string; type: string }[]
  rows: any[]
  user?: any
  models?: { tableName: string }[]
  search?: string
  sort?: string
  order?: string
  page?: number
  totalPages?: number
  basePath?: string
}

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
  return parts.length > 0 ? "?" + parts.map(([k, v]) => k + "=" + encodeURIComponent(v!)).join("&") : ""
}

export const AdminList: FC<AdminListProps> = ({ modelName, modelPlural, fields, rows, user, models, search, sort, order, page, totalPages, basePath }) => {
  const currentSort = sort || "id"
  const currentOrder = order || "asc"
  const currentSearch = search || ""
  const currentPage = page || 1

  function toggleSort(field: string): string {
    if (currentSort === field) return currentOrder === "asc" ? "desc" : "asc"
    return "asc"
  }

  function sortIcon(field: string): string {
    if (currentSort !== field) return ""
    return currentOrder === "asc" ? " ▲" : " ▼"
  }

  const path = basePath || "/admin/" + modelPlural

  const headers = [
    <a href={path + qs({ search: currentSearch, sort: "id", order: toggleSort("id"), page: "1" })} style="color:inherit;text-decoration:none">ID{sortIcon("id")}</a>,
    ...fields.map(f => (
      <a href={path + qs({ search: currentSearch, sort: f.name, order: toggleSort(f.name), page: "1" })} style="color:inherit;text-decoration:none">{f.name}{sortIcon(f.name)}</a>
    )),
    "Actions",
  ]

  const data = rows.map((row: any) => [
    row.id,
    ...fields.map(f => {
      const val = row[f.name]
      if (f.type === "bool") return val ? <span class="badge badge-success">true</span> : <span class="badge badge-danger">false</span>
      if (f.type === "file") {
        if (!val) return <span class="text-muted">-</span>
        if (typeof val === "string" && val.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) return <img src={val} style="max-width:60px;max-height:40px;border-radius:4px" />
        const safeUrl = typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/uploads/")) ? val : ""
        return safeUrl ? <a href={safeUrl} target="_blank">Download</a> : <span class="text-muted">file</span>
      }
      if (f.type === "richtext") {
        if (!val) return <span class="text-muted">-</span>
        const stripped = typeof val === "string" ? val.replace(/<[^>]*>/g, "").trim() : String(val)
        return stripped.length > 50 ? stripped.slice(0, 50) + "..." : stripped
      }
      if (val === null || val === undefined) return <span class="text-muted">-</span>
      return String(val).length > 50 ? String(val).slice(0, 50) + "..." : String(val)
    }),
    <div class="flex flex-gap">
      <Btn href={"/admin/" + modelPlural + "/" + row.id + "/edit"} variant="primary" class="btn-sm">Edit</Btn>
      <form method="POST" action={"/admin/" + modelPlural + "/" + row.id + "/delete"} style="display:inline">
        <button class="btn btn-danger btn-sm" onclick="return confirm('Delete?')">Delete</button>
      </form>
    </div>,
  ])

  const pagination = totalPages && totalPages > 1 ? (
    <div class="flex flex-gap" style="justify-content:center;align-items:center;margin-top:1rem">
      {currentPage > 1 ? <a href={path + qs({ search: currentSearch, sort: currentSort, order: currentOrder, page: String(currentPage - 1) })} class="btn btn-sm" style="text-decoration:none">← Prev</a> : <span class="btn btn-sm btn-disabled">← Prev</span>}
      <span class="text-sm text-muted">Page {currentPage} of {totalPages}</span>
      {currentPage < totalPages ? <a href={path + qs({ search: currentSearch, sort: currentSort, order: currentOrder, page: String(currentPage + 1) })} class="btn btn-sm" style="text-decoration:none">Next →</a> : <span class="btn btn-sm btn-disabled">Next →</span>}
    </div>
  ) : null

  return (
      <Layout title={modelName + " - Admin"} user={user} models={models}>
        <Card title={modelName} headerRight={<Btn href={"/admin/" + modelPlural + "/new"} variant="primary">+ New</Btn>}>
          <form method="GET" action={path} style="margin-bottom:1rem">
            <div class="flex flex-gap">
              <input type="text" name="search" placeholder="Search..." value={currentSearch} class="input" style="flex:1" />
              <button type="submit" class="btn btn-primary btn-sm">Search</button>
              {currentSearch ? <a href={path} class="btn btn-sm">Clear</a> : null}
            </div>
            <input type="hidden" name="sort" value={currentSort} />
            <input type="hidden" name="order" value={currentOrder} />
          </form>
          <Table headers={headers} rows={data} />
          {pagination}
        </Card>
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
  models?: { tableName: string }[]
}

export const AdminForm: FC<AdminFormProps> = ({ modelName, modelPlural, fields, values, isNew, error, user, models }) => {
  const hasFile = fields.some(f => f.type === "file" || f.type === "richtext")
  return (
  <Layout title={(isNew ? "New" : "Edit") + " " + modelName + " - Admin"} user={user} models={models}>
    <Card title={isNew ? "New " + modelName : "Edit " + modelName}>
      {error && <Flash type="error" message={error} />}
      <form method="POST" action={"/admin/" + modelPlural + (isNew ? "" : "/" + values?.id)} enctype={hasFile ? "multipart/form-data" : undefined}>
        {fields.map(f => {
          const fieldType = f.type === "text" || f.type === "content" ? "textarea" : f.type === "int" || f.type === "float" ? "number" : f.type === "bool" ? "select" : f.type === "file" ? "file" : f.type === "richtext" ? "richtext" : "text"
          return (
          <FormField
            label={f.name}
            name={f.name}
            type={fieldType}
            value={values?.[f.name]}
            required={f.required}
          />
        )})}
        <div class="flex flex-gap mt-4">
          <Btn variant="primary" type="submit">{isNew ? "Create" : "Save"}</Btn>
          <Btn href={"/admin/" + modelPlural}>Cancel</Btn>
        </div>
      </form>
    </Card>
  </Layout>
  )
}
