type Callback = (data: any) => void
type Unsubscribe = () => void

const topics = new Map<string, Set<{ id: string; cb: Callback }>>()
let idCounter = 0

export function subscribe(topic: string, cb: Callback): Unsubscribe {
  if (!topics.has(topic)) topics.set(topic, new Set())
  const id = "sub_" + (idCounter++)
  topics.get(topic)!.add({ id, cb })
  return () => {
    const t = topics.get(topic)
    if (t) { t.forEach(s => { if (s.id === id) t.delete(s) }) }
  }
}

export function publish(topic: string, data: any) {
  const t = topics.get(topic)
  if (t) t.forEach(s => { try { s.cb(data) } catch {} })
}

export function publishMany(topicsToPublish: string[], data: any) {
  for (const topic of topicsToPublish) publish(topic, data)
}
