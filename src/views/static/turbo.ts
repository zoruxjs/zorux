// ═══════════════════════════════════════════════════
// Zorux Turbo — Hotwire-like page updates
// Injected into admin pages via Layout.tsx
// ═══════════════════════════════════════════════════

// This file is compiled to JS and served at /static/turbo.js
// It provides:
// 1. Form submission via fetch (no page reload)
// 2. Link clicks via fetch for same-page navigation
// 3. WebSocket-based DOM updates from server events

const Turbo = (() => {
  let ws: WebSocket | null = null
  let wsConnected = false

  // ── Init ──

  function init() {
    // Intercept form submissions
    document.addEventListener("submit", handleForm, false)

    // Intercept same-origin links
    document.addEventListener("click", handleLink, false)

    // Connect WebSocket
    connectWebSocket()

    // Handle navigation with popstate
    window.addEventListener("popstate", () => {
      fetchPage(location.href, true)
    })
  }

  // ── WebSocket ──

  function connectWebSocket() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:"
    ws = new WebSocket(proto + "//" + location.host + "/ws")

    ws.onopen = () => { wsConnected = true }
    ws.onclose = () => { wsConnected = false; setTimeout(connectWebSocket, 3000) }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleSocketMessage(msg.topic, msg.data)
      } catch {}
    }
  }

  function handleSocketMessage(topic: string, data: any) {
    // Reload current page content when data changes
    const model = topic?.split(":")[0]
    const action = topic?.split(":")[1]

    // If we're on a list page for this model, refresh the table
    if (model && action) {
      refreshPageContent()
    }
  }

  // ── Form handling ──

  async function handleForm(e: Event) {
    const form = e.target as HTMLFormElement
    if (!form || form.getAttribute("data-turbo") === "false") return
    if (form.method?.toLowerCase() === "get") return

    e.preventDefault()

    const action = form.action || location.href
    const method = form.method || "POST"
    const formData = new FormData(form)

    try {
      const res = await fetch(action, {
        method,
        body: form.hasAttribute("enctype") ? formData : new URLSearchParams(formData as any),
        headers: form.hasAttribute("enctype") ? {} : { "Content-Type": "application/x-www-form-urlencoded" },
      })

      if (res.redirected) {
        // Follow redirect: fetch the redirected page
        await fetchPage(res.url, false)
        history.pushState(null, "", res.url)
      } else if (res.ok) {
        const html = await res.text()
        if (html.includes("<html")) {
          // Full page response — replace body content
          document.open()
          document.write(html)
          document.close()
        }
      }

      // Show flash messages
      const flash = form.querySelector(".flash")
      if (flash) flash.remove()

    } catch (err) {
      console.error("Turbo form error:", err)
    }
  }

  // ── Link handling ──

  function handleLink(e: MouseEvent) {
    const link = (e.target as HTMLElement)?.closest("a") as HTMLAnchorElement
    if (!link) return
    if (link.getAttribute("data-turbo") === "false") return
    if (link.target === "_blank") return
    if (e.metaKey || e.ctrlKey) return

    const url = link.href
    if (!url || url.startsWith("javascript:") || url.startsWith("#")) return
    if (url.startsWith("http") && !url.startsWith(location.origin)) return

    // Skip if it's a methods link (delete)
    if (link.getAttribute("data-method") === "delete") return

    e.preventDefault()
    fetchPage(url, false).then(() => history.pushState(null, "", url))
  }

  // ── Page fetching ──

  async function fetchPage(url: string, replace = false) {
    try {
      const res = await fetch(url, { headers: { "X-Turbo-Fetch": "true" } })
      const html = await res.text()

      // Extract content from the new page
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, "text/html")

      // Update title
      document.title = doc.title

      // Find the main content area and replace it
      const oldContent = document.querySelector("main.app-content")
      const newContent = doc.querySelector("main.app-content")
      if (oldContent && newContent) {
        oldContent.innerHTML = newContent.innerHTML
      } else {
        // Fallback: replace entire body
        document.body.innerHTML = doc.body.innerHTML
      }

      if (!replace) history.pushState(null, "", url)

      // Re-run scripts
      document.querySelectorAll("script[data-turbo-eval]").forEach((s: any) => {
        const newScript = document.createElement("script")
        newScript.textContent = s.textContent
        document.body.appendChild(newScript)
      })
    } catch (err) {
      console.error("Turbo fetch error:", err)
      // Fallback to normal navigation
      location.href = url
    }
  }

  // ── Content refresh ──

  let refreshTimeout: ReturnType<typeof setTimeout> | null = null

  function refreshPageContent() {
    if (refreshTimeout) clearTimeout(refreshTimeout)
    refreshTimeout = setTimeout(() => {
      // Get the current page content area and refresh it
      const main = document.querySelector("main.app-content")
      if (main) {
        const url = location.href
        fetch(url, { headers: { "X-Turbo-Fetch": "true" } })
          .then(r => r.text())
          .then(html => {
            const parser = new DOMParser()
            const doc = parser.parseFromString(html, "text/html")
            const newContent = doc.querySelector("main.app-content")
            if (newContent) main.innerHTML = newContent.innerHTML
          })
          .catch(() => {})
      }
    }, 300)
  }

  // ── Start ──

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }

  return { refreshPageContent, fetchPage }
})()

export {}
