// ── Allowed file types ──

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"])
const DOC_TYPES = new Set(["application/pdf", "text/plain", "text/csv"])
const ALLOWED_TYPES = new Set([...IMAGE_TYPES, ...DOC_TYPES])

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
  ".pdf", ".txt", ".csv",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".zip", ".gz", ".tar",
])

const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr",
  ".sh", ".bash", ".zsh",
  ".php", ".asp", ".aspx", ".jsp", ".war",
  ".py", ".rb", ".pl",
  ".jar", ".class", ".swf",
  ".dll", ".sys", ".vbs", ".ps1",
])

// ── Sanitize filename ──

export function sanitizeFilename(name: string): string {
  // Remove path traversal
  let clean = name.replace(/\.\.\//g, "").replace(/\.\.\\\\/g, "")
  // Remove null bytes
  clean = clean.replace(/\0/g, "")
  // Remove leading slashes and dots (hidden files, absolute paths)
  clean = clean.replace(/^[./\\]+/, "")
  // Replace spaces
  clean = clean.replace(/\s+/g, "_")
  // Only allow safe characters
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, "_")
  // Truncate
  return clean.slice(0, 255)
}

export function getAllowedExtension(filename: string): string | null {
  const ext = "." + filename.split(".").pop()?.toLowerCase()
  if (!ext || ext === ".") return null
  if (BLOCKED_EXTENSIONS.has(ext)) return null
  if (!ALLOWED_EXTENSIONS.has(ext)) return null
  return ext
}

export function isValidMimeType(mime: string): boolean {
  return ALLOWED_TYPES.has(mime) || mime.startsWith("image/")
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// ── HTML sanitization for output ──

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
}

export function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch] || ch)
}

// ── Input string sanitization ──

export function sanitizeInput(str: string): string {
  // Remove null bytes
  let clean = str.replace(/\0/g, "")
  // Remove control characters (except newline and tab)
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
  // Normalize line endings
  clean = clean.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  return clean
}

// ── JSON parsing with depth limit ──

export function parseJsonSafe(text: string, maxDepth = 20): any {
  const parsed = JSON.parse(text)
  checkDepth(parsed, maxDepth)
  return parsed
}

function checkDepth(obj: any, maxDepth: number, depth = 0): void {
  if (depth > maxDepth) throw new Error("JSON depth exceeds limit")
  if (obj && typeof obj === "object") {
    for (const val of Object.values(obj)) {
      if (val && typeof val === "object") checkDepth(val, maxDepth, depth + 1)
    }
  }
}
