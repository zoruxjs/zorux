import { subscribe, publish } from "./pubsub"

interface WSClient {
  ws: WebSocket
  subs: Set<string>
  id: string
}

const clients = new Map<string, WSClient>()

export function handleUpgrade(req: Request): Response | null {
  const upgrade = req.headers.get("upgrade")?.toLowerCase()
  if (upgrade !== "websocket") return null

  const { socket, response } = Bun.upgrade({
    data: { subs: new Set<string>(), id: crypto.randomUUID() },
  })

  return response
}

export function setupWebSocket(server: any) {
  server.ws("/ws", {
    open(ws: any) {
      const client: WSClient = { ws, subs: new Set(), id: ws.data.id }
      clients.set(client.id, client)
      ws.subscribe = (topic: string) => {
        client.subs.add(topic)
        const unsub = subscribe(topic, (data) => {
          try { ws.send(JSON.stringify({ topic, data })) } catch {}
        })
        ws.onClose(() => unsub())
      }
    },

    message(ws: any, rawMsg: string) {
      try {
        const msg = JSON.parse(rawMsg)
        if (msg.subscribe) ws.subscribe(msg.subscribe)
        if (msg.unsubscribe) ws.subs.delete(msg.unsubscribe)
      } catch {}
    },

    close(ws: any) {
      clients.delete(ws.data.id)
    },
  })
}

export function broadcast(topic: string, data: any) {
  publish(topic, data)
}

export { publish }
