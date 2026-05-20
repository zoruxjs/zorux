import { existsSync } from "fs"
import { join } from "path"

export interface ModelHooks {
  beforeCreate?: string
  afterCreate?: string
  beforeUpdate?: string
  afterUpdate?: string
  beforeDelete?: string
  afterDelete?: string
}

export async function runHook(rootDir: string, hookPath: string | undefined, context: any): Promise<any> {
  if (!hookPath) return null

  const fullPath = join(rootDir, hookPath)
  if (!existsSync(fullPath)) return null

  try {
    const mod = await import(fullPath)
    const handler = mod.default || Object.values(mod)[0]
    if (typeof handler === "function") {
      return await handler(context)
    }
    if (mod.handler && typeof mod.handler === "function") {
      return await mod.handler(context)
    }
  } catch (err: any) {
    console.warn(`[Zorux] Hook error (${hookPath}): ${err.message}`)
  }
  return null
}

export function getModelHooks(model: any): ModelHooks {
  return model.hooks || {}
}
