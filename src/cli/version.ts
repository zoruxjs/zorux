import { getVersion } from "../core/version"

export function versionCommand() {
  console.log("Zorux v" + getVersion())
  console.log("AI-first full-stack web framework")
  console.log("Runtime: Bun " + (Bun.version || "unknown"))
  console.log("Platform: " + process.platform + " (" + process.arch + ")")
}
