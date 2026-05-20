// Re-export from events module for backward compatibility
// Docs import from "zorux/realtime"
import { emit } from "../events/index.ts"
export { emit as publish, on as subscribe, onAny, clearListeners, getListeners } from "../events/index.ts"

export async function publishMany(events: Array<{ event: string; data: any }>): Promise<void[]> {
  return Promise.all(events.map(e => emit(e.event, e.data)))
}
