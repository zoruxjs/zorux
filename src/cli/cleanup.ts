import { readdirSync, readFileSync, writeFileSync, statSync } from "fs"
import { join } from "path"

export async function cleanupCommand(args: string[]) {
  const rootDir = process.cwd()
  const srcDir = join(rootDir, "src")
  const docsDir = join(rootDir, "docs")
  const llmDir = join(rootDir, "docs/llm")

  const fixes: { file: string; old: string; new: string }[] = [
    // Old framework name references
    { file: "src/core/version.ts", old: "Zorux.css", new: "admin.css" },
    { file: docsDir + "/getting-started.md", old: "fw dev", new: "zorux dev" },
    { file: docsDir + "/getting-started.md", old: "fw build", new: "zorux build" },
    { file: docsDir + "/yaml.md", old: "fw dev", new: "zorux dev" },
    { file: docsDir + "/cli.md", old: "fw doctor", new: "zorux doctor" },
    { file: docsDir + "/cli.md", old: "fw audit", new: "zorux audit" },
  ]

  // Dynamic: scan source for old names
  const patterns = [
    { old: /"fw\b/g, new: '"zorux' },
    { old: /'fw\b/g, new: "'zorux" },
    { old: /\bfw\./g, new: "zorux." },
    { old: /\bFW_/g, new: "ZORUX_" },
  ]

  let changed = 0
  const results: string[] = []

  // Fix known files
  for (const fix of fixes) {
    if (!existsSync(fix.file)) continue
    let content = readFileSync(fix.file, "utf-8")
    if (content.includes(fix.old)) {
      content = content.replaceAll(fix.old, fix.new)
      writeFileSync(fix.file, content, "utf-8")
      results.push(`  ${fix.file.replace(rootDir + "/", "")}: "${fix.old}" → "${fix.new}"`)
      changed++
    }
  }

  // Scan src/ for old patterns
  function scan(dir: string) {
    for (const f of readdirSync(dir)) {
      const fp = join(dir, f)
      if (statSync(fp).isDirectory()) { if (f !== "node_modules" && f !== "dist") scan(fp); continue }
      if (!fp.endsWith(".ts") && !fp.endsWith(".tsx") && !fp.endsWith(".md")) continue
      let content = readFileSync(fp, "utf-8")
      let modified = false
      for (const pat of patterns) {
        if (pat.old.test(content)) {
          content = content.replace(pat.old, pat.new as string)
          modified = true
          pat.old.lastIndex = 0
        }
      }
      if (modified) {
        writeFileSync(fp, content, "utf-8")
        results.push(`  ${fp.replace(rootDir + "/", "")}: pattern fixes applied`)
        changed++
      }
    }
  }

  if (existsSync(srcDir)) scan(srcDir)
  if (existsSync(docsDir)) scan(docsDir)
  if (existsSync(llmDir)) scan(llmDir)

  if (changed > 0) {
    console.log(`\n  🧹 Cleanup: ${changed} file(s) updated\n`)
    for (const r of results) console.log(r)
    console.log()
  } else {
    console.log("\n  🧹 No old references found — already clean\n")
  }
}

function existsSync(p: string) {
  try { statSync(p); return true } catch { return false }
}
