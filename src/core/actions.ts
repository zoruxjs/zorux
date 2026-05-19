import { readdirSync, existsSync } from "fs"
import { join, resolve } from "path"

interface ActionHandler {
  policy: string
  role?: string
  ownerField?: string
  handler: (c: any) => any | Promise<any>
}

type ActionExports = Record<string, ActionHandler>

export async function loadActions(actionsDir: string): Promise<Record<string, Record<string, ActionHandler>>> {
  const result: Record<string, Record<string, ActionHandler>> = {}

  const dir = resolve(actionsDir)
  if (!existsSync(dir)) return result

  const files = readdirSync(dir).filter(f => f.endsWith(".ts"))

  for (const file of files) {
    const moduleName = file.replace(".ts", "")
    const modulePath = join(dir, file)

    try {
      const url = Bun.pathToFileURL(modulePath).href
      const mod = await import(url) as ActionExports
      if (typeof mod === "object") {
        result[moduleName] = {}
        for (const [key, value] of Object.entries(mod)) {
          if (value && typeof value === "object" && "handler" in value) {
            result[moduleName][key] = value
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to load action:", file, err.message)
    }
  }

  return result
}
