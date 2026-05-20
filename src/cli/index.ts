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
  if (!name) { console.error("zorux new <name> [--preset <preset>] [--api | --web | --saas] [--ui <theme>]"); process.exit(1) }
  const presetIdx = args.indexOf("--preset")
  const uiIdx = args.indexOf("--ui")
  const opts = {
    preset: presetIdx >= 0 && args.length > presetIdx + 1 ? args[presetIdx + 1] : undefined,
    api: args.includes("--api"),
    web: args.includes("--web"),
    mobile: args.includes("--mobile"),
    fullstack: args.includes("--fullstack"),
    saas: args.includes("--saas"),
    all: args.includes("--all"),
    minimal: args.includes("--minimal"),
    ui: uiIdx >= 0 && args.length > uiIdx + 1 ? args[uiIdx + 1] : "default",
  }
  if (!opts.preset && !opts.api && !opts.web && !opts.mobile && !opts.fullstack && !opts.saas && !opts.all) opts.web = true
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
} else if (cmd === "recipe") {
  const { recipeCommand } = await import("./recipe")
  await recipeCommand(args)
} else if (cmd === "inspect") {
  const { inspectCommand } = await import("./inspect")
  await inspectCommand(args)
} else if (cmd === "explain") {
  const { explainCommand } = await import("./explain")
  await explainCommand(args)
} else if (cmd === "verify") {
  const { verifyCommand } = await import("./verify")
  await verifyCommand(args)
} else if (cmd === "doctor") {
  const { doctorCommand } = await import("./doctor")
  await doctorCommand(args)
} else if (cmd === "context") {
  const { contextCommand } = await import("./context")
  await contextCommand(args)
} else if (cmd === "routes") {
  const { routesCommand } = await import("./routes")
  await routesCommand(args)
} else if (cmd === "map") {
  const { mapCommand } = await import("./map")
  await mapCommand(args)
} else if (cmd === "diff") {
  const { diffCommand } = await import("./diff")
  await diffCommand(args)
} else if (cmd === "decisions") {
  const { decisionsCommand } = await import("./decisions")
  await decisionsCommand(args)
} else if (cmd === "ownership") {
  const { ownershipCommand } = await import("./ownership")
  await ownershipCommand(args)
} else if (cmd === "token-report" || cmd === "tokens") {
  const { tokenReportCommand } = await import("./token-report")
  await tokenReportCommand(args)
} else if (cmd === "snapshot") {
  const { snapshotCommand } = await import("./snapshot")
  await snapshotCommand(args)
} else if (cmd === "cleanup") {
  const { cleanupCommand } = await import("./cleanup")
  await cleanupCommand(args)
} else if (cmd === "agent" && args[1] === "init") {
  const { agentInitCommand } = await import("./agent")
  await agentInitCommand(args)
} else if (cmd === "guard" && args[1] === "install") {
  const { guardInstallCommand } = await import("./guard")
  await guardInstallCommand()
} else if (cmd === "lint" && args[1] === "agent") {
  const { lintAgentCommand } = await import("./lint-agent")
  await lintAgentCommand()
} else if (cmd === "add" && args[1] === "field") {
  const { addFieldCommand } = await import("./add-commands")
  await addFieldCommand(args)
} else if (cmd === "add" && args[1] === "page") {
  const { addPageCommand } = await import("./add-commands")
  await addPageCommand(args)
} else if (cmd === "add" && args[1] === "package") {
  const { addPackageCommand } = await import("./add-commands")
  await addPackageCommand(args)
} else if (cmd === "add" && args[1] === "plugin") {
  const { addPluginCommand } = await import("./add-commands")
  await addPluginCommand(args)
} else if (cmd === "apply") {
  const { applyCommand } = await import("./apply")
  await applyCommand(args)
} else if (cmd === "lint" && args[1] === "ai") {
  const { lintAiCommand } = await import("./lint-ai")
  await lintAiCommand()
} else if (cmd === "quality") {
  const { qualityCommand } = await import("./quality")
  await qualityCommand()
} else if (cmd === "review") {
  const { reviewCommand } = await import("./review")
  await reviewCommand()
} else if (cmd === "fix" && args[1] === "ai") {
  const { fixAiCommand } = await import("./fix")
  await fixAiCommand()
} else {
  console.log("Zorux v" + getVersion() + " - AI-first web framework")
  console.log("")
  console.log("Usage:")
  console.log("  zorux new <name> [--preset api|web|saas|blog] [--minimal] [--ui <theme>]")
  console.log("  zorux dev [port]")
  console.log("  zorux recipe add <name>")
  console.log("  zorux inspect [--json]")
  console.log("  zorux explain [app.yaml]")
  console.log("  zorux verify")
  console.log("  zorux doctor [--verbose]")
  console.log("  zorux context [--budget N] [--output <path>]")
  console.log("  zorux routes")
  console.log("  zorux map")
  console.log("  zorux diff")
  console.log("  zorux decisions")
  console.log("  zorux ownership <model|/route|field>")
  console.log("  zorux token-report           📊 Token economy estimate")
  console.log("  zorux snapshot               📸 Project state snapshot")
  console.log("  zorux cleanup                🧹 Remove old reference names")
  console.log("  zorux agent init             🤖 Generate agent instructions")
  console.log("  zorux lint agent             🧹 Detect agent anti-patterns")
  console.log("  zorux lint ai                🧪 Detect LLM anti-patterns")
  console.log("  zorux quality                📊 Code quality metrics")
  console.log("  zorux review                 👁️  Diff review heuristics")
  console.log("  zorux fix ai                 🔧 Automatic codemods")
  console.log("  zorux add field <m> <f>:<t>  ➕ Add field to model")
  console.log("  zorux add page <name>        📄 Generate DaisyUI page")
  console.log("  zorux add package <pkg>      📦 Install + register provider")
  console.log("  zorux add model <Name> <field>:<type> [flags...]")
  console.log("  zorux make action|job|migration <name>")
  console.log("  zorux seed [--count N]")
  console.log("  zorux deploy")
  console.log("  zorux test [--run] [--e2e] [--security]")
  console.log("  zorux db reset|migrate|rollback|status")
  console.log("  zorux audit")
  console.log("  zorux info")
  console.log("  zorux docs [topic]")
  console.log("  zorux scaffold forum|blog|ecommerce|saas [name]")
  console.log("  zorux console")
  console.log("  zorux runner <script>")
  console.log("  zorux plugin list|add|remove")
  console.log("  zorux credentials setup|edit|show")
  console.log("  zorux version")
  console.log("")
  console.log("Feature maturity:")
  console.log("  ✅ Stable: API, CRUD, SQLite, Admin, Auth, OpenAPI, Cache")
  console.log("  🧪 Beta:   GraphQL, Webhooks, Jobs, Plugins, Feature Flags")
  console.log("  🔬 Experimental: Mobile (Expo), Desktop (Tauri), Payments, Multiple DB providers")
  console.log("")
  console.log("Recipes:")
  console.log("  zorux recipe add blog       Add blog (Post, Category, Comment)")
  console.log("  zorux recipe add teams      Add organization teams")
  console.log("  zorux recipe add billing    Add Stripe subscriptions")
}
