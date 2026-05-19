export function completionCommand(args: string[]) {
  const shell = args[1] || "bash"

  const bashCompletion = `_Zorux_completions() {
  local cur=\${COMP_WORDS[COMP_CWORD]}
  local prev=\${COMP_WORDS[COMP_CWORD-1]}

  case $COMP_CWORD in
    1)
      COMPREPLY=($(compgen -W "new dev gen add seed deploy test docs audit db make info version completion" -- "$cur"))
      ;;
    2)
      case $prev in
        new) COMPREPLY=($(compgen -W "--api --web --mobile --fullstack --saas" -- "$cur")) ;;
        gen) COMPREPLY=($(compgen -W "mobile" -- "$cur")) ;;
        add) COMPREPLY=($(compgen -W "model" -- "$cur")) ;;
        test) COMPREPLY=($(compgen -W "--run --e2e --security" -- "$cur")) ;;
        deploy) COMPREPLY=($(compgen -W "--docker --vercel --netlify --cloudflare" -- "$cur")) ;;
        db) COMPREPLY=($(compgen -W "reset" -- "$cur")) ;;
        make) COMPREPLY=($(compgen -W "action job" -- "$cur")) ;;
        docs) COMPREPLY=($(compgen -W "--list auth api yaml email jobs cli security deploy plugins storage mobile realtime admin database" -- "$cur")) ;;
      esac
      ;;
    3)
      case $prev in
        action) COMPREPLY=($(compgen -W "post user product" -- "$cur")) ;;
        job) COMPREPLY=($(compgen -W "send-" -- "$cur")) ;;
      esac
      ;;
  esac
}

complete -F _Zorux_completions fw
`

  switch (shell) {
    case "zsh":
      console.log(`#compdef fw
_fw() {
  local -a commands
  commands=(
    "new:Create a new project"
    "dev:Start development server"
    "gen:Generate code"
    "add:Add to project"
    "seed:Seed database"
    "deploy:Generate deployment config"
    "test:Generate tests"
    "docs:View documentation"
    "audit:Security audit"
    "db:Database commands"
    "make:Scaffold files"
    "info:Show project info"
    "version:Show version"
  )

  _arguments \\
    "1: :{_describe 'command' commands}" \\
    "*:: :->args"
}
_fw "$@"
`)
      break
    case "fish":
      console.log(`# fw completion for fish
set -l commands new dev gen add seed deploy test docs audit db make info version

complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "new" -d "Create a new project"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "dev" -d "Start development server"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "gen" -d "Generate code"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "add" -d "Add to project"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "seed" -d "Seed database"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "deploy" -d "Generate deployment config"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "test" -d "Generate tests"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "docs" -d "View documentation"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "audit" -d "Security audit"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "db" -d "Database commands"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "make" -d "Scaffold files"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "info" -d "Show project info"
complete -c fw -n "not __fish_seen_subcommand_from $commands" -a "version" -d "Show version"
`)
      break
    default:
      console.log(bashCompletion)
  }
}
