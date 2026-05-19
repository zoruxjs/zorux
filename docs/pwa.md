# PWA (Progressive Web App)

Zorux generates PWA support with manifest, service worker, and icons for installable web apps.

## Generation

```bash
zorux gen pwa
```

This creates PWA files in the `public/` directory.

## Generated Files

### manifest.json

```json
{
  "name": "My App",
  "short_name": "MyApp",
  "description": "My Zorux Application",
  "start_url": "/admin",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#a855f7",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### sw.js (Service Worker)

```javascript
const CACHE_NAME = "zorux-v1"
const STATIC_ASSETS = [
  "/",
  "/admin",
  "/static/app.css",
  "/static/turbo.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
]

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
})

// Activate: clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
})

// Fetch: network-first strategy
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
```

## Auto-Registration

Admin pages automatically register the service worker and manifest:

```html
<link rel="manifest" href="/manifest.json">
<script>
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
  }
</script>
```

## Install Prompt

The browser will show an install prompt when:

1. The app is served over HTTPS (or localhost)
2. A service worker is registered
3. A valid manifest exists
4. The user visits the site twice, 5 minutes apart

### Custom Install Prompt

```javascript
let deferredPrompt

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault()
  deferredPrompt = e
  showInstallButton()
})

function showInstallButton() {
  const btn = document.getElementById("install-btn")
  btn.style.display = "block"
  btn.onclick = async () => {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
  }
}
```

## Offline Support

The service worker uses a network-first strategy:

1. **Try network** — Fetch from server
2. **Fallback to cache** — If offline, serve cached version
3. **Cache on success** — Update cache with fresh response

### Offline Page

Create a custom offline page:

```html
<!-- public/offline.html -->
<!DOCTYPE html>
<html>
<head><title>Offline</title></head>
<body>
  <h1>You're offline</h1>
  <p>Check your connection and try again.</p>
  <button onclick="location.reload()">Retry</button>
</body>
</html>
```

Update the service worker to serve it:

```javascript
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match("/offline.html"))
  )
})
```

## Icons

Generate icons in multiple sizes:

```
public/icons/
├── icon-72.png
├── icon-96.png
├── icon-128.png
├── icon-144.png
├── icon-152.png
├── icon-192.png
├── icon-384.png
├── icon-512.png
└── icon.svg
```

## Testing PWA

### Chrome DevTools

1. Open DevTools → Application → Manifest
2. Verify manifest properties
3. Check service worker status
4. Test offline mode

### Lighthouse

```bash
# Install Lighthouse CLI
npm i -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view
```

### Checklist

- [ ] Valid `manifest.json`
- [ ] Service worker registered
- [ ] HTTPS (or localhost)
- [ ] Icons in multiple sizes
- [ ] Offline fallback
- [ ] Install prompt works

## Platform Support

| Platform | Installable | Notes |
|---|---|---|
| Chrome (Android) | ✅ | Full support |
| Chrome (Desktop) | ✅ | Full support |
| Safari (iOS) | ✅ | "Add to Home Screen" |
| Safari (macOS) | ✅ | "Add to Dock" |
| Firefox (Android) | ✅ | Full support |
| Edge (Desktop) | ✅ | Full support |
