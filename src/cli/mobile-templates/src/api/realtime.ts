let ws: WebSocket | null = null
const listeners = new Map<string, Set<(data: any) => void>>()
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return
  const proto = location.protocol === "https:" ? "wss:" : "ws:"
  ws = new WebSocket(proto + "//" + location.host + "/ws")

  ws.onopen = () => {
    for (const topic of listeners.keys()) {
      ws!.send(JSON.stringify({ subscribe: topic }))
    }
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string)
      const topicListeners = listeners.get(msg.topic)
      if (topicListeners) {
        for (const fn of topicListeners) fn(msg.data)
      }
    } catch {}
  }

  ws.onclose = () => {
    ws = null
    reconnectTimer = setTimeout(connect, 3000)
  }

  ws.onerror = () => ws?.close()
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (ws) { ws.close(); ws = null }
}

export function subscribe(topic: string, callback: (data: any) => void) {
  if (!listeners.has(topic)) listeners.set(topic, new Set())
  listeners.get(topic)!.add(callback)
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ subscribe: topic }))
  }
  return () => {
    listeners.get(topic)?.delete(callback)
  }
}

export function useRealtime(topic: string, callback: (data: any) => void) {
  const { useEffect, useRef } = require("react")
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    connect()
    const unsub = subscribe(topic, (data: any) => cbRef.current(data))
    return () => { unsub(); disconnect() }
  }, [topic])
}
