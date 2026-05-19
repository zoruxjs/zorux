import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"

let _version: string | null = null

function findPackageJson(startDir: string): string | null {
  let dir = startDir
  for (let i = 0; i < 10; i++) {
    const p = join(dir, "package.json")
    if (existsSync(p)) return p
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
  return null
}

export function getVersion(): string {
  if (_version) return _version
  try {
    // Try multiple locations
    const candidates = [
      join(import.meta.dir, "../../package.json"),
      join(import.meta.dir, "../package.json"),
      join(import.meta.dir, "package.json"),
    ]
    for (const p of candidates) {
      if (existsSync(p)) {
        _version = JSON.parse(readFileSync(p, "utf-8")).version || "0.1.0"
        return _version
      }
    }
    // Fallback: search up from current dir
    const found = findPackageJson(import.meta.dir)
    if (found) {
      _version = JSON.parse(readFileSync(found, "utf-8")).version || "0.1.0"
      return _version
    }
    _version = "0.1.0"
  } catch {
    _version = "0.1.0"
  }
  return _version
}
