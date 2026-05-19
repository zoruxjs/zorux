import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join, extname } from "path"

interface BundledAsset {
  path: string
  content: string
  hash: string
  type: string
}

const cache = new Map<string, BundledAsset>()
let cacheBustVersion = ""

function generateHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36).slice(0, 8)
}

function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")      // Remove comments
    .replace(/\s+/g, " ")                    // Collapse whitespace
    .replace(/\s*({|}|;|,|>|~|\+|:)\s*/g, "$1") // Remove space around operators
    .replace(/;}/g, "}")                     // Remove last semicolon
    .trim()
}

function minifyJS(js: string): string {
  return js
    .replace(/\/\/.*$/gm, "")                // Remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, "")        // Remove block comments
    .replace(/\s+/g, " ")                    // Collapse whitespace
    .replace(/\s*({|}|;|,|\(|\)|==|===|!=|!==|=>|\+|-|\*|\/|&&|\|\||\?|:)\s*/g, "$1")
    .replace(/;}/g, "}")                     // Remove last semicolon
    .trim()
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    ".css": "text/css",
    ".js": "application/javascript",
    ".ts": "application/javascript",
    ".tsx": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
  }
  return types[ext] || "application/octet-stream"
}

function bundleFile(rootDir: string, filePath: string): BundledAsset {
  const cached = cache.get(filePath)
  if (cached) return cached

  if (!existsSync(filePath)) {
    throw new Error("Asset not found: " + filePath)
  }

  let content = readFileSync(filePath, "utf-8")
  const ext = extname(filePath).toLowerCase()

  if (ext === ".css") {
    content = minifyCSS(content)
  } else if (ext === ".js") {
    content = minifyJS(content)
  }

  const hash = generateHash(content)
  const asset: BundledAsset = { path: filePath, content, hash, type: getContentType(ext) }
  cache.set(filePath, asset)
  return asset
}

export function bundleCSS(rootDir: string): string {
  const cssPath = join(rootDir, "src", "views", "static", "kai.css")
  const asset = bundleFile(rootDir, cssPath)
  return asset.content
}

export function bundleJS(rootDir: string): string {
  const jsPath = join(rootDir, "src", "views", "static", "turbo.js")
  const asset = bundleFile(rootDir, jsPath)
  return asset.content
}

export function getAssetHash(rootDir: string, name: string): string {
  const paths: Record<string, string> = {
    "kai.css": join(rootDir, "src", "views", "static", "kai.css"),
    "turbo.js": join(rootDir, "src", "views", "static", "turbo.js"),
  }
  const filePath = paths[name]
  if (!filePath) return ""
  try {
    const asset = bundleFile(rootDir, filePath)
    return asset.hash
  } catch {
    return ""
  }
}

export function bustCache(): void {
  cache.clear()
  cacheBustVersion = Date.now().toString(36)
}

export function getCacheBuster(): string {
  return cacheBustVersion || ""
}

// Write bundled files to public/ directory for production
export function writeBundledAssets(rootDir: string): void {
  const publicDir = join(rootDir, "public")
  mkdirSync(publicDir, { recursive: true })

  const assets = [
    { name: "Zorux.css", path: join(rootDir, "src", "views", "static", "Zorux.css"), type: "css" },
    { name: "turbo.js", path: join(rootDir, "src", "views", "static", "turbo.js"), type: "js" },
  ]

  for (const asset of assets) {
    if (!existsSync(asset.path)) continue
    const bundled = bundleFile(rootDir, asset.path)
    // Write hashed version
    const hashedName = asset.name.replace(/\.(\w+)$/, `.${bundled.hash}.$1`)
    writeFileSync(join(publicDir, hashedName), bundled.content)
    // Write non-hashed version (for direct references)
    writeFileSync(join(publicDir, asset.name), bundled.content)
  }
}
