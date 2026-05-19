import type { AppConfig, CompiledModel } from "../types"
import type { PlatformAdapter } from "./types"
import { createZoruxPlatform } from "./zorux"

export async function createPlatform(config: any, models: any[]) {
  const provider = config.provider || "Zorux"
  if (provider === "Zorux") return createZoruxPlatform(config, models)
  throw new Error("Unknown platform provider: " + provider + ". Supported: Zorux, supabase")
}
