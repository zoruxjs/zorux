# Desktop (Tauri)

Zorux generates a complete Tauri v2 desktop application that connects to your Zorux API.

## Generation

```bash
zorux gen desktop
```

This creates a `desktop/` directory with a full Tauri v2 project.

## Project Structure

```
desktop/
├── src-tauri/                  # Tauri backend (Rust)
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Tauri v2 config
│   ├── build.rs
│   ├── capabilities/
│   │   └── default.json
│   ├── icons/                  # App icons
│   │   ├── icon.ico
│   │   └── icon.png
│   └── src/
│       └── main.rs             # Rust entry point
├── package.json
├── index.html                  # Frontend HTML
└── src/                        # Frontend JavaScript/TypeScript
    └── main.ts
```

## Tauri Config

```json
{
  "productName": "My App",
  "version": "0.1.0",
  "identifier": "com.myapp.desktop",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:3000"
  },
  "app": {
    "windows": [
      {
        "title": "My App",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self' http://localhost:3000; connect-src 'self' http://localhost:3000 ws://localhost:3000"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

## Rust Entry Point

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Frontend

The desktop app connects to your Zorux API at `http://localhost:3000` (development) or your production URL.

```typescript
// src/main.ts
const API_URL = "http://localhost:3000/api"

async function loadPosts() {
  const res = await fetch(`${API_URL}/posts`)
  const data = await res.json()
  renderPosts(data.rows)
}

loadPosts()
```

## Running in Development

```bash
cd desktop

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

This opens a native window connected to your dev server.

## Building for Production

```bash
# Build for current platform
npm run tauri build

# Build for specific platforms
npm run tauri build -- --target x86_64-apple-darwin
npm run tauri build -- --target x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

### Output

| Platform | Output |
|---|---|
| macOS | `src-tauri/target/release/bundle/macos/My App.app` |
| Windows | `src-tauri/target/release/bundle/msi/My App_x64_en-US.msi` |
| Linux | `src-tauri/target/release/bundle/deb/my-app_0.1.0_amd64.deb` |

## Features

### Native Menus

```rust
use tauri::{Menu, Submenu, MenuItem};

fn main() {
    tauri::Builder::default()
        .menu(Menu::with_items([
            Submenu::with_items("File", [
                MenuItem::CloseWindow.into(),
            ]).into(),
        ]))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### System Tray

```rust
use tauri::{SystemTray, SystemTrayMenu, SystemTrayMenuItem};

fn main() {
    let tray = SystemTray::new()
        .with_menu(SystemTrayMenu::new()
            .add_item(SystemTrayMenuItem::Show)
            .add_native_item(SystemTrayMenuItem::Separator)
            .add_item(SystemTrayMenuItem::Quit));

    tauri::Builder::default()
        .system_tray(tray)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### File Dialogs

```typescript
import { open, save } from "@tauri-apps/plugin-dialog"

// Open file
const filepath = await open({
  multiple: false,
  filters: [{ name: "Images", extensions: ["png", "jpg"] }]
})

// Save file
const filepath = await save({
  filters: [{ name: "JSON", extensions: ["json"] }]
})
```

### Notifications

```typescript
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification"

let permission = await isPermissionGranted()
if (!permission) {
  permission = await requestPermission() === "granted"
}

if (permission) {
  sendNotification({ title: "New Post", body: "A new post has been created!" })
}
```

## Cross-Platform

Tauri v2 supports:

| Platform | Architectures |
|---|---|
| macOS | x86_64, aarch64 (Apple Silicon) |
| Windows | x86_64, aarch64 |
| Linux | x86_64, aarch64 |

## Requirements

### macOS

- Xcode Command Line Tools
- Rust toolchain

### Windows

- Visual Studio Build Tools (C++ workload)
- Rust toolchain (MSVC target)

### Linux

- WebKit2GTK development package
- Rust toolchain

```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file openssl libssl-dev libgtk-3-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel curl wget file openssl openssl-devel gtk3-devel
```

## Production Configuration

Update the API URL for production:

```json
{
  "build": {
    "devUrl": "http://localhost:3000",
    "frontendDist": "../dist"
  }
}
```

Set the production API URL in your frontend code:

```typescript
const API_URL = process.env.NODE_ENV === "production"
  ? "https://api.myapp.com/api"
  : "http://localhost:3000/api"
```
