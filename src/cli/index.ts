import { getVersion } from "../core/version"
import { newCommand } from "./new"
import { devCommand } from "./dev"
import { genMobileCommand } from "./gen-mobile"
import { genDesktopCommand } from "./gen-desktop"
import { genPwaCommand } from "./gen-pwa"
import { genGraphQLCommand } from "./gen-graphql"
import { addModelCommand } from "./add"
import { seedCommand } from "./seed"
import { deployCommand } from "./deploy"
import { testCommand } from "./test"
import { auditCommand } from "./audit"
import { docsCommand } from "./docs"
import { dbCommand } from "./db"
import { makeCommand } from "./make"
import { infoCommand } from "./info"
import { versionCommand } from "./version"
import { completionCommand } from "./completion"
import { scaffoldCommand } from "./scaffold"
import { consoleCommand } from "./console"
import { credentialsCommand } from "./credentials"
import { runnerCommand } from "./runner"

const args = process.argv.slice(2)
const cmd = args[0]

if (cmd === "new") {
  const name = args[1]
  if (!name) { console.error("zorux new <name> [--api | --web | --mobile | --fullstack]"); process.exit(1) }
  const opts = {
    api: args.includes("--api"),
    web: args.includes("--web"),
    mobile: args.includes("--mobile"),
    fullstack: args.includes("--fullstack"),
    saas: args.includes("--saas"),
    all: args.includes("--all"),
  }
  if (!opts.api && !opts.web && !opts.mobile && !opts.fullstack && !opts.saas && !opts.all) opts.web = true
  await newCommand(name, opts)
} else if (cmd === "dev") {
  devCommand({ port: args[1] || "3000" })
} else if (cmd === "gen" && args[1] === "mobile") {
  genMobileCommand(process.cwd())
} else if (cmd === "gen" && args[1] === "desktop") {
  genDesktopCommand(process.cwd())
} else if (cmd === "gen" && args[1] === "pwa") {
  genPwaCommand(process.cwd())
} else if (cmd === "gen" && args[1] === "graphql") {
  genGraphQLCommand(process.cwd())
} else if (cmd === "add" && args[1] === "model") {
  await addModelCommand(args)
} else if (cmd === "seed") {
  seedCommand(args)
} else if (cmd === "deploy") {
  deployCommand(args)
} else if (cmd === "test") {
  testCommand(args)
} else if (cmd === "audit") {
  await auditCommand()
} else if (cmd === "docs") {
  docsCommand(args)
} else if (cmd === "db") {
  dbCommand(args)
} else if (cmd === "make") {
  await makeCommand(args)
} else if (cmd === "info") {
  infoCommand()
} else if (cmd === "version" || cmd === "--version" || cmd === "-v") {
  versionCommand()
} else if (cmd === "completion") {
  completionCommand(args)
} else if (cmd === "scaffold") {
  await scaffoldCommand(args)
} else if (cmd === "console" || cmd === "c") {
  await consoleCommand()
} else if (cmd === "credentials") {
  credentialsCommand(args)
} else if (cmd === "plugin" || cmd === "plugins") {
  const { pluginCommand } = await import("./plugin")
  await pluginCommand(args)
} else if (cmd === "runner") {
  await runnerCommand(args)
} else {
  console.log("Zorux v" + getVersion() + " - AI-first web framework")
  console.log("")
  console.log("Usage:")
  console.log("  zorux new <name> [--api | --web | --mobile | --fullstack | --saas | --all]")
  console.log("  zorux dev [port]")
  console.log("  zorux gen mobile")
  console.log("  zorux gen desktop")
  console.log("  zorux gen pwa")
  console.log("  zorux gen graphql")
  console.log("  zorux add model <Name> <field>:<type> [flags...]")
  console.log("  zorux make action <name> <handler> [...]")
  console.log("  zorux make job <name>")
  console.log("  zorux make migration <name>")
  console.log("  zorux seed [--count N] [Model:N ...]")
  console.log("  zorux deploy")
  console.log("  zorux test [--run] [--e2e] [--security]")
  console.log("  zorux db reset|migrate [--auto]|rollback|status|schema dump")
  console.log("  zorux audit")
  console.log("  zorux info")
  console.log("  zorux docs [topic]")
  console.log("  zorux completion [bash|zsh|fish]")
  console.log("  zorux scaffold forum|blog|ecommerce|saas [name]")
  console.log("  zorux console")
  console.log("  zorux runner <script>")
  console.log("  zorux plugin list|add|remove")
  console.log("  zorux credentials {setup|edit|show}")
  console.log("  zorux version")
}
