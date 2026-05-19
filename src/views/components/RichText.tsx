import type { FC } from "hono/jsx"

interface RichTextProps {
  name: string
  value?: string
  label: string
}

// Trix editor component — loads from CDN automatically
export const RichText: FC<RichTextProps> = ({ name, value, label }) => (
  <div class="form-group">
    <label for={name}>{label}</label>
    <div style="margin-bottom:4px">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/trix@2/dist/trix.min.css" />
      <script src="https://cdn.jsdelivr.net/npm/trix@2/dist/trix.umd.min.js"></script>
    </div>
    <input type="hidden" id={name} name={name} value={value || ""} />
    <trix-editor input={name} style="min-height:200px;border:1px solid var(--border,#334155);border-radius:6px;padding:12px;background:var(--bg-alt,#1e293b);color:var(--text,#f1f5f9);font-size:14px"></trix-editor>
  </div>
)

// Strip HTML for list preview
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim().slice(0, 100)
}
