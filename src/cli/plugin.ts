import { readFileSync, existsSync, writeFileSync } from "fs"
import { join } from "path"
import { parseAppConfig } from "../core/yaml"
import { loadPlugins } from "../core/plugin"

export async function pluginCommand(args: string[]) {
  const sub = args[1]
  const rootDir = process.cwd()
  const yamlPath = join(rootDir, "app.yaml")

  if (!existsSync(yamlPath)) {
    console.error("No app.yaml found in current directory")
    process.exit(1)
  }

  const config = parseAppConfig(rootDir)
  const pluginNames = config.plugins || []

  if (sub === "list" || !sub) {
    console.log("Plugins configured in app.yaml:")
    if (pluginNames.length === 0) {
      console.log("  (none)")
    } else {
      for (const name of pluginNames) {
        console.log("  - " + name)
      }
    }

    // Try to load and show details
    const plugins = await loadPlugins(rootDir, config)
    if (plugins.length > 0) {
      console.log("")
      console.log("Loaded plugins:")
      for (const p of plugins) {
        console.log("  " + p.name + (p.version ? " v" + p.version : "") + (p.description ? " — " + p.description : ""))
        if (p.dependsOn?.length) {
          console.log("    depends on: " + p.dependsOn.join(", "))
        }
      }
    }
  } else if (sub === "add") {
    const name = args[2]
    if (!name) { console.error("zorux plugin add <name>"); process.exit(1) }
    const yaml = readFileSync(yamlPath, "utf-8")
    if (yaml.includes("plugins:")) {
      // Add to existing plugins list
      const lines = yaml.split("\n")
      const pluginIdx = lines.findIndex(l => l.trim().startsWith("plugins:"))
      const existing = pluginNames
      if (existing.includes(name)) {
        console.log("Plugin '" + name + "' already in app.yaml")
        return
      }
      existing.push(name)
      // Replace the plugins line
      const indent = lines[pluginIdx].match(/^\s*/)?.[0] || ""
      lines[pluginIdx] = indent + "plugins:"
      lines.splice(pluginIdx + 1, existing.length)
      for (const p of existing) {
        lines.splice(pluginIdx + 1, 0, indent + "  - " + p)
      }
      writeFileSync(yamlPath, lines.join("\n"))
    } else {
      writeFileSync(yamlPath, yaml + "\nplugins:\n  - " + name + "\n")
    }
    console.log("Added plugin '" + name + "' to app.yaml")
  } else if (sub === "remove") {
    const name = args[2]
    if (!name) { console.error("zorux plugin remove <name>"); process.exit(1) }
    const filtered = pluginNames.filter(n => n !== name)
    if (filtered.length === pluginNames.length) {
      console.log("Plugin '" + name + "' not found in app.yaml")
      return
    }
    const yaml = readFileSync(yamlPath, "utf-8")
    const lines = yaml.split("\n")
    const newLines = lines.filter(l => l.trim() !== "- " + name)
    writeFileSync(yamlPath, newLines.join("\n"))
    console.log("Removed plugin '" + name + "' from app.yaml")
  } else {
    console.log("Usage:")
    console.log("zorux plugin list              List configured plugins")
    console.log("zorux plugin add <name>        Add a plugin to app.yaml")
    console.log("zorux plugin remove <name>     Remove a plugin from app.yaml")
  }
}
