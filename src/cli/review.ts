import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"
import { execSync } from "child_process"

export async function reviewCommand() {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")
  if (!existsSync(appYamlPath)) { console.error("[Zorux] No app.yaml found"); process.exit(1) }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)

  console.log(`\n  👁️  ${config.name || "Zorux App"} — Diff Review\n`)

  // Get changed files
  let changedFiles: string[] = []
  try {
    const gitDiff = execSync("git diff --name-only", { cwd: rootDir, encoding: "utf-8" })
    changedFiles = gitDiff.split("\n").filter(Boolean)
    const gitUntracked = execSync("git ls-files --others --exclude-standard", { cwd: rootDir, encoding: "utf-8" })
    changedFiles.push(...gitUntracked.split("\n").filter(Boolean))
  } catch {
    changedFiles = []
  }

  if (changedFiles.length === 0) {
    // Check for unstaged changes in key files
    for (const f of ["app.yaml", "actions", "plugins", "web"]) {
      if (existsSync(join(rootDir, f))) changedFiles.push(f)
    }
  }

  const findings: { severity: "high" | "medium" | "low"; msg: string }[] = []

  // 1. Check new public routes
  for (const f of changedFiles) {
    if (f.startsWith("plugins/") || f.startsWith("web/")) {
      const fp = join(rootDir, f)
      if (!existsSync(fp) || statSync(fp).isDirectory()) continue
      const content = readFileSync(fp, "utf-8")
      const routes = content.match(/app\.(get|post)\(['"`]\/([^'"`]+)/g)
      if (routes) {
        for (const r of routes) {
          const path = r.match(/['"`]\/([^'"`]+)/)?.[1] || ""
          // Check if it duplicates a generated route
          for (const m of modelNames) {
            const plural = (models[m]?.plural || m.toLowerCase() + "s").replace(/ss$/, "s")
            if (path.includes(plural) || path.includes(m.toLowerCase())) {
              findings.push({
                severity: "high",
                msg: `Route /${path} may duplicate generated CRUD for model "${m}"`
              })
            }
          }
          // Check if public route has rate limit
          if (!content.includes("rateLimit") && !content.includes("rate_limit")) {
            findings.push({
              severity: "medium",
              msg: `Route /${path} in ${f} has no rate limiting`
            })
          }
        }
      }
    }
  }

  // 2. Check new models without tests
  for (const [name, m] of Object.entries(models)) {
    const def = m as any
    const hasTest = existsSync(join(rootDir, "tests", `${name.toLowerCase()}.test.ts`)) ||
                    existsSync(join(rootDir, "test", `${name.toLowerCase()}.test.ts`))
    if (!hasTest && Object.keys(def.fields || {}).length > 2) {
      findings.push({
        severity: "medium",
        msg: `Model "${name}" has no dedicated test file`
      })
    }
  }

  // 3. Check for public create without validation
  for (const [name, m] of Object.entries(models)) {
    const def = m as any
    if (def.policies?.create === "*") {
      findings.push({
        severity: "high",
        msg: `Model "${name}" has public create policy — no input validation enforced`
      })
    }
  }

  // 4. Check app.yaml changes
  if (changedFiles.includes("app.yaml")) {
    findings.push({
      severity: "low",
      msg: "app.yaml modified — run zorux verify to validate changes"
    })
  }

  // 5. Check for new npm packages
  const pkgPath = join(rootDir, "package.json")
  if (existsSync(pkgPath)) {
    try {
      const gitPkg = execSync("git show HEAD:package.json", { cwd: rootDir, encoding: "utf-8" })
      const oldPkg = JSON.parse(gitPkg)
      const newPkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
      const oldDeps = { ...oldPkg.dependencies, ...oldPkg.devDependencies }
      const newDeps = { ...newPkg.dependencies, ...newPkg.devDependencies }
      for (const dep of Object.keys(newDeps)) {
        if (!oldDeps[dep]) {
          const unnecessary = ["express", "prisma", "passport", "bcrypt", "jsonwebtoken"]
          if (unnecessary.includes(dep)) {
            findings.push({
              severity: "high",
              msg: `New package "${dep}" — Zorux provides this functionality built-in`
            })
          } else {
            findings.push({
              severity: "low",
              msg: `New package "${dep}" added`
            })
          }
        }
      }
    } catch {}
  }

  // Print
  if (findings.length === 0) {
    console.log("  ✅ No issues found in staged changes\n")
    return
  }

  const high = findings.filter(f => f.severity === "high").length
  const medium = findings.filter(f => f.severity === "medium").length
  const low = findings.filter(f => f.severity === "low").length

  for (const f of findings) {
    const icon = f.severity === "high" ? "❌" : f.severity === "medium" ? "⚠️" : "ℹ️"
    console.log(`  ${icon}  [${f.severity.toUpperCase()}] ${f.msg}`)
  }
  console.log(`\n  📊 ${high} high, ${medium} medium, ${low} low\n`)
}
