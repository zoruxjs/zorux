// ─── Action Pattern ───
// Custom API handler. Accessible at POST /api/actions/<module>/<handler>
// Edit the handler function below.

import { F } from "zorux"

interface ActionInput {
  // Define your input types here
}

interface ActionOutput {
  success: boolean
  data?: any
  error?: string
}

export const handler = async (c: any): Promise<Response> => {
  try {
    const body: ActionInput = await c.req.json()

    // Validate input
    if (!body || Object.keys(body).length === 0) {
      return c.json({ success: false, error: "Input required" }, 400)
    }

    // Your logic here

    return c.json({ success: true, data: body })
  } catch (err: any) {
    console.error("[action] Error:", err.message)
    return c.json({ success: false, error: err.message }, 500)
  }
}
