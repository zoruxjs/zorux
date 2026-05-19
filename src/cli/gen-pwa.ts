import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs"
import { join, relative } from "path"
import { load as yamlLoad } from "js-yaml"

export function genPwaCommand(rootDir: string) {
  // Read project config
  const yamlPath = join(rootDir, "app.yaml")
  let name = "Zorux App"
  let themeColor = "#0f172a"
  let bgColor = "#0f172a"

  if (existsSync(yamlPath)) {
    try {
      const config: any = yamlLoad(readFileSync(yamlPath, "utf-8"))
      name = config.name || name
      const theme = config.theme || {}
      if (theme.mode === "light") {
        themeColor = "#ffffff"
        bgColor = "#f8fafc"
      }
    } catch {}
  }

  const pwaDir = join(rootDir, "public")
  if (!existsSync(pwaDir)) mkdirSync(pwaDir, { recursive: true })

  // ── manifest.json ──
  const manifest = {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) + "..." : name,
    description: name + " — built with Zorux Framework",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: bgColor,
    theme_color: themeColor,
    icons: [
      { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["productivity", "business"],
    lang: "en",
    scope: "/",
  }
  writeFileSync(join(pwaDir, "manifest.json"), JSON.stringify(manifest, null, 2))

  // ── Service Worker ──
  writeFileSync(join(pwaDir, "sw.js"), `// Zorux PWA Service Worker
const CACHE = "Zorux-v1"
const ASSETS = ["/", "/manifest.json", "/static/Zorux.css"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    ))
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      return cached || fetchPromise
    })
  )
})
`)

  // ── SVG Icons (inline data URIs for generation) ──
  // Generate simple SVG icons
  const svgIcon = (size: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${themeColor}"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="${size * 0.4}" font-family="sans-serif" font-weight="bold">K</text>
</svg>`

  writeFileSync(join(pwaDir, "pwa-icon-192.png"), svgIcon(192))
  writeFileSync(join(pwaDir, "pwa-icon-512.png"), svgIcon(512))

  console.log("  - Created public/manifest.json")
  console.log("  - Created public/sw.js (service worker)")
  console.log("  - Created public/pwa-icon-{192,512}.png")
  console.log("")
  console.log("  PWA is ready! The admin pages will auto-detect and prompt install.")
  console.log("  To test: serve with HTTPS or use Chrome DevTools -> Lighthouse -> PWA")
  console.log("")
}
