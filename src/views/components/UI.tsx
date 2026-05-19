import type { FC } from "hono/jsx"

interface CardProps { title?: string; children: any; headerRight?: any }
export const Card: FC<CardProps> = ({ title, children, headerRight }) => (
  <div class="card">
    {title && (
      <div class="card-header">
        <h2>{title}</h2>
        {headerRight && <div>{headerRight}</div>}
      </div>
    )}
    {children}
  </div>
)

interface TableProps { headers: string[]; rows: any[][] }
export const Table: FC<TableProps> = ({ headers, rows }) => (
  <div class="table-wrap">
    <table>
      <thead>
        <tr>{headers.map(h => <th>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map(row => <tr>{row.map(cell => <td>{cell}</td>)}</tr>)}
        {rows.length === 0 && (
          <tr><td colspan={headers.length}><div class="empty"><h3>No records</h3></div></td></tr>
        )}
      </tbody>
    </table>
  </div>
)

interface BtnProps { href?: string; variant?: string; class?: string; children: any }
export const Btn: FC<BtnProps> = ({ href, variant, children, ...props }) => {
  const cls = "btn" + (variant ? " btn-" + variant : "")
  if (href) return <a href={href} class={cls} {...props}>{children}</a>
  return <button class={cls} {...props}>{children}</button>
}

interface FormFieldProps { label: string; name: string; type?: string; value?: any; required?: boolean }
export const FormField: FC<FormFieldProps> = ({ label, name, type = "text", value, required }) => (
  <div class="form-group">
    <label for={name}>{label}</label>
    {type === "richtext" ? (
      <div>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/trix@2/dist/trix.min.css" />
        <script src="https://cdn.jsdelivr.net/npm/trix@2/dist/trix.umd.min.js"></script>
        <input type="hidden" id={name} name={name} value={value || ""} />
        <trix-editor input={name} style="min-height:200px;border:1px solid var(--border,#334155);border-radius:6px;padding:12px;background:var(--bg-alt,#1e293b);color:var(--text,#f1f5f9);font-size:14px"></trix-editor>
      </div>
    ) : type === "file" ? (
      <div>
        {value && <div style="margin-bottom:0.5rem">{typeof value === "string" && (value.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? <img src={value} style="max-width:200px;max-height:100px;border-radius:4px" /> : <a href={value} target="_blank">View file</a>)}</div>}
        <input id={name} name={name} type="file" />
        <input type="hidden" name={"_existing_" + name} value={value || ""} />
      </div>
    ) : type === "textarea" ? (
      <textarea id={name} name={name} required={required}>{value || ""}</textarea>
    ) : type === "select" ? (
      <select id={name} name={name}>{value}</select>
    ) : (
      <input id={name} name={name} type={type} value={value || ""} required={required} />
    )}
  </div>
)

interface FlashProps { type: string; message: string }
export const Flash: FC<FlashProps> = ({ type, message }) => (
  <div class={"flash flash-" + type}>{message}</div>
)

export const EmptyState: FC<{ title: string; message: string }> = ({ title, message }) => (
  <div class="empty"><h3>{title}</h3><p>{message}</p></div>
)
