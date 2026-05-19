export function versionCommand() {
  console.log("Zorux v0.1.0")
  console.log("AI-first full-stack web framework")
  console.log("Runtime: Bun " + (Bun.version || "unknown"))
  console.log("Platform: " + process.platform + " (" + process.arch + ")")
}
