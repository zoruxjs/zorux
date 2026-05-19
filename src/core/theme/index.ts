import type { ThemeAdapter, ThemeConfig, UIFramework } from "./types"
import { tailwindAdapter } from "./tailwind"
import { daisyUIAdapter } from "./daisyui"

export type { ThemeAdapter, ThemeConfig, UIFramework } from "./types"

const adapters: Record<string, ThemeAdapter> = {
  tailwind: tailwindAdapter,
  daisyui: daisyUIAdapter,
}

// Lazy-loaded adapters (dependencies may not be installed)
async function loadAdapter(name: string): Promise<ThemeAdapter | null> {
  try {
    switch (name) {
      case "antd": return (await import("./antd")).antdAdapter
      case "mui": return (await import("./mui")).muiAdapter
      case "chakra": return (await import("./chakra")).chakraAdapter
      case "mantine": return (await import("./mantine")).mantineAdapter
      case "headless": return (await import("./headless")).headlessAdapter
      case "daisyui": return (await import("./daisyui")).daisyUIAdapter
    }
  } catch {}
  return null
}

export function getThemeAdapter(config?: ThemeConfig | string): ThemeAdapter {
  const name = typeof config === "string" ? config : config?.framework || "tailwind"
  const adapter = adapters[name]
  if (adapter) return adapter

  // For adapters not yet loaded, return tailwind as fallback
  // In production, loadAdapter would be called during project setup
  return tailwindAdapter
}

export function getThemeClasses(config?: ThemeConfig | string): Record<string, string> {
  return getThemeAdapter(config).classes as any
}

export function getThemeComponent(name: string, config?: ThemeConfig | string): string {
  const adapter = getThemeAdapter(config)
  return (adapter.components as any)[name] || name
}

export function getUIProvider(config?: ThemeConfig | string): string {
  return getThemeAdapter(config).getProvider()
}

export function getUIDependencies(config?: ThemeConfig | string): string[] {
  return getThemeAdapter(config).getDependencies()
}
