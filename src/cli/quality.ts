import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function qualityCommand() {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")
  if (!existsSync(appYamlPath)) { console.error("[Zorux] No app.yaml found"); process.exit(1) }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const models = config.models || {}
  const modelNames = Object.keys(models)
  const pkgPath = join(rootDir, "package.json")
  let pkg: any = {}
  if (existsSync(pkgPath)) try { pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) } catch {}

  // Count metrics
  let customFiles = 0, customLines = 0, largestFile = "", largestLines = 0
  let manualRoutes = 0, totalDeps = 0, testFiles = 0

  for (const dir of ["actions", "plugins", "web"]) {
    const d = join(rootDir, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d, { recursive: true }).filter(f => f.endsWith(".ts") || f.endsWith(".tsx"))) {
      const fp = join(d, f)
      if (statSync(fp).isDirectory()) continue
      customFiles++
      const lines = readFileSync(fp, "utf-8").split("\n").length
      customLines += lines
      if (lines > largestLines) { largestLines = lines; largestFile = f }
    }
  }

  // Count test files
  const testsDir = join(rootDir, "tests") || join(rootDir, "test")
  if (existsSync(testsDir)) {
    testFiles = readdirSync(testsDir).filter(f => f.endsWith(".test.ts") || f.endsWith(".spec.ts")).length
  }

  // Count manual routes
  for (const dir of ["plugins", "web"]) {
    const d = join(rootDir, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d, { recursive: true }).filter(f => f.endsWith(".ts") || f.endsWith(".tsx"))) {
      const fp = join(d, f)
      if (statSync(fp).isDirectory()) continue
      const content = readFileSync(fp, "utf-8")
      manualRoutes += (content.match(/app\.(get|post|put|delete|patch)\(/g) || []).length
    }
  }

  const pkgDeps = { ...pkg.dependencies, ...pkg.devDependencies } || {}
  totalDeps = Object.keys(pkgDeps).length

  // Generated routes count
  const generatedRoutes = modelNames.length * 5 + (config.auth ? 4 : 0) + (config.type !== "api" ? 5 : 0)

  // AI risk score
  let riskScore = 0
  riskScore += customFiles > 10 ? 20 : customFiles > 5 ? 10 : 0
  riskScore += manualRoutes > 5 ? 20 : manualRoutes > 2 ? 10 : 0
  riskScore += largestLines > 300 ? 15 : largestLines > 150 ? 5 : 0
  riskScore += testFiles === 0 ? 15 : 0
  riskScore += totalDeps > 20 ? 10 : totalDeps > 10 ? 5 : 0
  const riskLabel = riskScore >= 40 ? "high" : riskScore >= 20 ? "medium" : "low"

  // Print
  console.log(`\n  📊 ${config.name || "Zorux App"} — Quality Report\n`)
  console.log(`  Generated: ${modelNames.length} models → ${generatedRoutes} routes`)
  console.log(`  Custom code: ${customFiles} files, ${customLines} lines`)
  if (largestFile) console.log(`  Largest: ${largestFile} (${largestLines} lines)`)
  console.log(`  Manual routes: ${manualRoutes}`)
  console.log(`  External packages: ${totalDeps}`)
  console.log(`  Test files: ${testFiles}`)
  console.log()
  console.log(`  AI Risk Score: ${riskScore}/100 (${riskLabel})`)
  if (riskLabel === "high") {
    console.log(`  ⚠️  High risk — consider splitting large files, adding tests, reducing manual routes`)
  }
  console.log()
}
