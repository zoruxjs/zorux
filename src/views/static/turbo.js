// KAI Turbo - Hotwire-like page updates
(function() {
  var ws = null, refreshTimer = null

  function init() {
    document.addEventListener("submit", handleForm, false)
    document.addEventListener("click", handleLink, false)
    connectWS()
    window.addEventListener("popstate", function() { fetchPage(location.href, true) })
  }

  function connectWS() {
    var proto = location.protocol === "https:" ? "wss:" : "ws:"
    ws = new WebSocket(proto + "//" + location.host + "/ws")
    ws.onopen = function() {}
    ws.onclose = function() { setTimeout(connectWS, 3000) }
    ws.onmessage = function(event) {
      try { refreshContent() } catch(e) {}
    }
  }

  function refreshContent() {
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(function() {
      var main = document.querySelector("main.app-content")
      if (!main) return
      fetch(location.href, { headers: { "X-Turbo-Fetch": "true" } })
        .then(function(r) { return r.text() })
        .then(function(html) {
          var parser = new DOMParser()
          var doc = parser.parseFromString(html, "text/html")
          var newContent = doc.querySelector("main.app-content")
          if (newContent) main.innerHTML = newContent.innerHTML
          document.title = doc.title
        })
        .catch(function() {})
    }, 300)
  }

  function handleForm(e) {
    var form = e.target
    if (!form || form.getAttribute("data-turbo") === "false") return
    if (form.method && form.method.toLowerCase() === "get") return
    e.preventDefault()

    var action = form.action || location.href
    var formData = new FormData(form)

    fetch(action, {
      method: form.method || "POST",
      body: form.hasAttribute("enctype") ? formData : new URLSearchParams(formData),
      headers: form.hasAttribute("enctype") ? {} : { "Content-Type": "application/x-www-form-urlencoded" },
      redirect: "manual",
    }).then(function(res) {
      if (res.type === "opaqueredirect" || res.status === 302 || res.status === 301) {
        var location = res.headers.get("location")
        if (location) { fetchPage(location, false); history.pushState(null, "", location) }
        return
      }
      if (res.ok) {
        res.text().then(function(html) {
          if (html.includes("<html")) { document.open(); document.write(html); document.close() }
          else refreshContent()
        })
      }
    }).catch(function(err) { console.error("Turbo error:", err) })
  }

  function handleLink(e) {
    var link = e.target.closest ? e.target.closest("a") : null
    if (!link) return
    if (link.getAttribute("data-turbo") === "false") return
    if (link.target === "_blank" || e.metaKey || e.ctrlKey) return
    var url = link.href
    if (!url || url.startsWith("javascript:") || url.startsWith("#")) return
    if (url.startsWith("http") && !url.startsWith(location.origin)) return
    e.preventDefault()
    fetchPage(url, false).then(function() { history.pushState(null, "", url) })
  }

  function fetchPage(url, replace) {
    return fetch(url, { headers: { "X-Turbo-Fetch": "true" } }).then(function(res) {
      return res.text()
    }).then(function(html) {
      var parser = new DOMParser()
      var doc = parser.parseFromString(html, "text/html")
      document.title = doc.title
      var oldContent = document.querySelector("main.app-content")
      var newContent = doc.querySelector("main.app-content")
      if (oldContent && newContent) { oldContent.innerHTML = newContent.innerHTML }
      else { document.body.innerHTML = doc.body.innerHTML }
      if (!replace) history.pushState(null, "", url)
    }).catch(function() { location.href = url })
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})()
