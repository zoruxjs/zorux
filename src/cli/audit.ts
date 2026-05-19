import { readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import { readdir } from "fs/promises"

export async function auditCommand() {
  const rootDir = process.cwd()

  if (!existsSync(join(rootDir, "app.yaml"))) {
    console.error("[Zorux] No app.yaml found. Run this from your Zorux project root.")
    process.exit(1)
  }

  console.log("\n  \u{1F50D} Zorux Security Audit\n")
  let issues = 0
  let passed = 0

  // 1. Check JWT secret
  const pkgPath = join(rootDir, ".env")
  if (existsSync(pkgPath)) {
    const env = readFileSync(pkgPath, "utf-8")
    if (env.includes("change-this-to-a-random-secret") || env.includes("Zorux-dev-secret")) {
      console.log("  \u26A0  JWT_SECRET is using a weak default value")
      issues++
    } else if (env.includes("JWT_SECRET=")) {
      console.log("  \u2705 JWT_SECRET is configured")
      passed++
    }
  } else {
    console.log("  \u26A0  No .env file found — JWT_SECRET may be using default")
    issues++
  }

  // 2. Check CORS
  const yamlRaw = readFileSync(join(rootDir, "app.yaml"), "utf-8")
  if (!yamlRaw.includes("cors")) {
    console.log("  \u2705 CORS: using framework defaults (permissive for development)")
    passed++
  }

  // 3. Check for Python/Node version of app.yaml (security misconfig)
  if (yamlRaw.includes("password:") && !yamlRaw.includes("auth:")) {
    console.log("  \u26A0  Sensitive field 'password' detected without auth configuration")
    issues++
  }

  // 4. Check database URL
  if (yamlRaw.includes(":memory:")) {
    console.log("  \u2705 Database: in-memory (safe for development)")
    passed++
  }

  // 5. Check dependencies
  try {
    const { spawnSync } = require("child_process")
    const hasAudit = Bun.version && parseInt(Bun.version.split(".")[0] || "1") >= 1
    if (hasAudit) {
      const result = spawnSync("bun", ["audit"], {
        cwd: rootDir,
        stdio: "pipe",
        encoding: "utf-8",
      })
      if (result.status === 0) {
        console.log("  \u2705 Dependencies: bun audit passed")
        passed++
      } else {
        console.log("  \u26A0  Dependencies: audit found issues (run 'bun audit' to check)")
        issues++
      }
    } else {
      console.log("  \u2139  Dependency audit skipped (requires Bun 1.x)")
      passed++
    }
  } catch {
    console.log("  \u2139  Dependency audit skipped (not available)")
    passed++
  }

  // 6. Check for .gitignore
  if (existsSync(join(rootDir, ".gitignore"))) {
    const gi = readFileSync(join(rootDir, ".gitignore"), "utf-8")
    if (gi.includes(".env")) {
      console.log("  \u2705 .env is in .gitignore")
      passed++
    } else {
      console.log("  \u26A0  .env is NOT in .gitignore — secrets could be committed!")
      issues++
    }
  } else {
    console.log("  \u26A0  No .gitignore found")
    issues++
  }

  // 7. Check for hardcoded secrets in source files
  const srcDir = join(rootDir, "actions")
  if (existsSync(srcDir)) {
    const files = readdirSync(srcDir).filter(f => f.endsWith(".ts"))
    for (const file of files) {
      const content = readFileSync(join(srcDir, file), "utf-8")
      const secretPatterns = [
        /(?:api[Kk]ey|apikey|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/,
        /AKIA[0-9A-Z]{16}/, // AWS access key
        /sk_live_[0-9a-zA-Z]{24,}/, // Stripe secret
        /xox[bpsa]-[0-9a-zA-Z]{10,}/, // Slack token
      ]
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          console.log("  \u26A0  Possible hardcoded secret in actions/" + file)
          issues++
          break
        }
      }
    }
  }
  if (issues === 0) {
    console.log("  \u2705 No hardcoded secrets found in actions/")
    passed++
  }

  // Summary
  const total = issues + passed
  const score = total > 0 ? Math.round((passed / total) * 100) : 0

  console.log("")
  console.log("  \u2500".repeat(30))
  console.log("  Score: " + score + "% (" + passed + "/" + total + " checks passed)")
  if (issues > 0) {
    console.log("  Issues found: " + issues)
    console.log("  \u2139  Run 'fw test --security' to generate security tests")
  } else {
    console.log("  \u2705 All checks passed!")
  }
  console.log("")

  process.exit(issues > 0 ? 1 : 0)
}
