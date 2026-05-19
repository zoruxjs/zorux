// ═══════════════════════════════════════════════════
// Event System — pub/sub for internal events
// ═══════════════════════════════════════════════════

type EventHandler = (data: any, eventName: string) => void | Promise<void>

interface EventSubscription {
  event: string
  handler: EventHandler
  priority: number
}

let listeners: EventSubscription[] = []
let wildcardListeners: EventHandler[] = []

// ═══════════════════════════════════════════════════
// Subscribe
// ═══════════════════════════════════════════════════

export function on(event: string, handler: EventHandler, priority = 0): () => void {
  const sub: EventSubscription = { event, handler, priority }
  listeners.push(sub)
  // Sort by priority (higher first)
  listeners.sort((a, b) => b.priority - a.priority)
  return () => { listeners = listeners.filter(s => s !== sub) }
}

export function onAny(handler: EventHandler): () => void {
  wildcardListeners.push(handler)
  return () => { wildcardListeners = wildcardListeners.filter(h => h !== handler) }
}

// ═══════════════════════════════════════════════════
// Emit
// ═══════════════════════════════════════════════════

export async function emit(event: string, data: any): Promise<void> {
  const matching = listeners.filter(s => {
    if (s.event === event) return true
    // Support wildcards: "posts.*" matches "posts.created"
    if (s.event.endsWith(".*")) {
      const prefix = s.event.slice(0, -2)
      if (event.startsWith(prefix)) return true
    }
    return false
  })

  for (const sub of matching) {
    try {
      await sub.handler(data, event)
    } catch (err) {
      console.error("[event] Error in handler for '" + event + "':", err)
    }
  }

  // Wildcard listeners
  for (const handler of wildcardListeners) {
    try {
      await handler(data, event)
    } catch (err) {
      console.error("[event] Error in wildcard handler for '" + event + "':", err)
    }
  }
}

// ═══════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════

export function clearListeners(): void {
  listeners = []
  wildcardListeners = []
}

export function getListeners(): EventSubscription[] {
  return [...listeners]
}
