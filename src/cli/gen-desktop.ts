import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs"
import { join, relative } from "path"
import { load as yamlLoad } from "js-yaml"

export function genDesktopCommand(rootDir: string) {
  // Read project name from app.yaml
  const yamlPath = join(rootDir, "app.yaml")
  let projectName = "Zorux-app"
  if (existsSync(yamlPath)) {
    try {
      const config: any = yamlLoad(readFileSync(yamlPath, "utf-8"))
      projectName = config.name?.toLowerCase().replace(/\s+/g, "-") || projectName
    } catch {}
  }

  const desktopDir = join(rootDir, "desktop")
  if (existsSync(desktopDir)) {
    console.log("Desktop directory already exists. Delete it first.")
    process.exit(1)
  }

  const srcDir = join(desktopDir, "src-tauri")
  const rsDir = join(srcDir, "src")
  const iconsDir = join(srcDir, "icons")
  mkdirSync(iconsDir, { recursive: true })
  mkdirSync(rsDir, { recursive: true })

  console.log("Generating desktop app (Tauri) for " + projectName + "...")

  // ── Cargo.toml ──
  writeFileSync(join(srcDir, "Cargo.toml"), `[package]
name = "${projectName}"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
`)

  // ── tauri.conf.json ──
  writeFileSync(join(srcDir, "tauri.conf.json"), JSON.stringify({
    $schema: "https://raw.githubusercontent.com/nicoverbruggen/tauri-v2-schema/refs/heads/main/tauri.conf.schema.json",
    productName: projectName,
    version: "0.1.0",
    identifier: "com." + projectName + ".app",
    build: {
      frontendDist: "../web",
      devUrl: "http://localhost:3000",
      beforeDevCommand: "",
      beforeBuildCommand: "",
    },
    app: {
      title: projectName,
      windows: [{
        title: projectName,
        width: 1200,
        height: 800,
        resizable: true,
        fullscreen: false,
        minWidth: 800,
        minHeight: 600,
      }],
      security: {
        csp: null,
      },
    },
    bundle: {
      active: true,
      targets: "all",
      icon: [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico",
      ],
    },
  }, null, 2))

  // ── main.rs ──
  writeFileSync(join(srcDir, "src", "main.rs"), `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
`)

  // ── build.rs ──
  writeFileSync(join(srcDir, "build.rs"), `fn main() {
    tauri_build::build()
}
`)

  // ── Icons (simple placeholder SVGs) ──
  writeFileSync(join(iconsDir, "32x32.png"), "")
  writeFileSync(join(iconsDir, "128x128.png"), "")
  writeFileSync(join(iconsDir, "128x128@2x.png"), "")
  writeFileSync(join(iconsDir, "icon.icns"), "")
  writeFileSync(join(iconsDir, "icon.ico"), "")

  // ── Desktop info file ──
  writeFileSync(join(desktopDir, "README.md"), `# ${projectName} Desktop

Desktop app built with Tauri v2.

## Prerequisites

- Rust: https://rustup.rs
- Tauri CLI: \`cargo install tauri-cli --version "^2"\`

## Development

\`\`\`bash
# Start Zorux server
cd .. && fw dev

# In another terminal, start Tauri dev
cd desktop
cargo tauri dev
\`\`\`

## Build

\`\`\`bash
cd desktop
cargo tauri build
\`\`\`

Output will be in \`src-tauri/target/release/\`.
`)

  console.log("  - Created desktop/src-tauri/ (Tauri v2)")
  console.log("  - Configured to connect to localhost:3000")
  console.log("")
  console.log("  Next steps:")
  console.log("    cd " + relative(process.cwd(), desktopDir))
  console.log("    cargo tauri dev")
  console.log("  Or build for production:")
  console.log("    cargo tauri build")
  console.log("")
}
