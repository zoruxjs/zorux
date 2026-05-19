import { readFileSync } from "fs"
import { join } from "path"

let _version: string | null = null

export function getVersion(): string {
  if (_version) return _version
  try {
    const pkg = JSON.parse(readFileSync(join(import.meta.dir, "../../package.json"), "utf-8"))
    _version = pkg.version || "0.1.0"
  } catch {
    _version = "0.1.0"
  }
  return _version
}
