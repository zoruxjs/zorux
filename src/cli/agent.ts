import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"

export async function agentInitCommand(args: string[]) {
  const rootDir = process.cwd()
  const appYamlPath = join(rootDir, "app.yaml")

  if (!existsSync(appYamlPath)) {
    console.error("[Zorux] No app.yaml found — run zorux agent init from project root")
    process.exit(1)
  }

  const config = load(readFileSync(appYamlPath, "utf-8")) as any
  const appName = config.name || "Zorux App"
  const dotAgent = join(rootDir, ".zorux", "agent")
  mkdirSync(dotAgent, { recursive: true })
  mkdirSync(join(rootDir, ".cursor", "rules"), { recursive: true })
  mkdirSync(join(rootDir, ".github"), { recursive: true })
  mkdirSync(join(rootDir, ".windsurf", "rules"), { recursive: true })

  const agentReadme = `# Zorux Agent Instructions

This is a **${appName}** Zorux project.

## Source of Truth

The single source of truth is \`app.yaml\`.
Edit this file to define models, auth, database, cache, email, plugins, and real-time.

## Preferred Commands

| Task | Command |
|------|---------|
| Add model | edit \`app.yaml\` or \`zorux add model\` |
| Add field | edit \`app.yaml\` |
| Create page | \`zorux add page <name>\` |
| Create plugin | \`zorux add plugin <name>\` |
| Install package | \`zorux add package <name>\` |
| DB migration | \`zorux db migrate\` |
| Run tests | \`zorux test\` |
| Validate | \`zorux verify\` |
| Diagnostic | \`zorux doctor\` |
| Context | \`zorux context\` |
| Apply recipe | \`zorux recipe add <name>\` |

## What NOT to Do

- Do NOT create Express servers — use plugins with \`onRoutes(app)\`
- Do NOT create Prisma schemas — use \`app.yaml\` models
- Do NOT hand-write CRUD — auto-generated from models
- Do NOT install auth libraries — Zorux has 35 OAuth providers built-in
- Do NOT install Next.js — use \`web/pages/*.tsx\`
- Do NOT hand-write migrations — use \`zorux db migrate\`
- Do NOT run \`npx create-*\` inside this project

## After Changes

Run \`zorux verify\` to validate the project contract.
`

  writeFileSync(join(rootDir, "AGENTS.md"), agentReadme, "utf-8")
  console.log("  ✅ AGENTS.md")

  writeFileSync(join(rootDir, "CLAUDE.md"), `# ${appName} — Zorux Project

Commands: \`zorux dev\`, \`zorux test\`, \`zorux verify\`, \`zorux context\`, \`zorux doctor\`, \`zorux db migrate\`, \`zorux recipe add\`
Source: \`app.yaml\`
Custom: \`actions/*.ts\`, \`plugins/*.ts\`, \`web/pages/*.tsx\`

- Do NOT install auth libraries — built-in
- Do NOT hand-write CRUD — generated
- Do NOT use Prisma
- Do NOT create Express servers
- Run \`zorux verify\` after changes
`, "utf-8")
  console.log("  ✅ CLAUDE.md")

  writeFileSync(join(rootDir, ".cursor", "rules", "zorux.mdc"), `---
description: Zorux Framework Rules
globs: ["app.yaml", "actions/*.ts", "plugins/*.ts", "web/**/*.tsx"]
---
# Zorux Framework
- \`app.yaml\` is the single source of truth
- Do NOT hand-write CRUD — auto-generated
- Do NOT install auth libraries — 35 built-in OAuth providers
- Do NOT create Express servers — use plugins
- After editing \`app.yaml\`, run \`zorux verify\`
`, "utf-8")
  console.log("  ✅ .cursor/rules/zorux.mdc")

  writeFileSync(join(rootDir, ".github", "copilot-instructions.md"), `# Zorux Copilot Instructions
This is a Zorux project.
- Source of truth: \`app.yaml\`
- Prefer editing YAML over writing code for models, auth, policies
- Do NOT hand-write CRUD — auto-generated
- Do NOT install auth libraries — built-in
- Run \`zorux verify\` after changes
`, "utf-8")
  console.log("  ✅ .github/copilot-instructions.md")

  writeFileSync(join(rootDir, ".windsurf", "rules", "zorux.md"), `# Zorux Windsurf Rules
1. Read \`app.yaml\` first — source of truth
2. Edit YAML for models, auth, config
3. Use \`plugins/*.ts\` for custom routes
4. Do NOT hand-roll CRUD
5. Run \`zorux verify\` after changes
`, "utf-8")
  console.log("  ✅ .windsurf/rules/zorux.md")

  writeFileSync(join(dotAgent, "README.md"), agentReadme, "utf-8")
  console.log("  ✅ .zorux/agent/README.md")

  writeFileSync(join(dotAgent, "allowed-actions.json"), JSON.stringify({
    preferredCommands: [
      "zorux dev", "zorux test", "zorux verify", "zorux context",
      "zorux doctor", "zorux add model", "zorux add page",
      "zorux add plugin", "zorux add package",
      "zorux make action", "zorux make job", "zorux db migrate",
      "zorux recipe add", "zorux inspect", "zorux explain",
      "zorux routes", "zorux map",
    ],
    discouragedCommands: [
      "npx create-*", "npm install express", "npm install next",
      "npm install prisma", "npm install passport", "npm install bcrypt",
    ],
    editableFiles: ["app.yaml", "actions/**/*.ts", "jobs/**/*.ts", "plugins/**/*.ts", "web/**/*.tsx"],
    generatedFiles: [".zorux/**", "dist/**", "node_modules/**"],
  }, null, 2), "utf-8")
  console.log("  ✅ .zorux/agent/allowed-actions.json")

  console.log(`\n  ✅ Agent instructions for ${appName}`)
  console.log("  Next: run zorux context\n")
}
