// Re-export storage provider factory
// Docs import from "zorux/storage"
import type { StorageDef } from "../types.ts"

export interface StorageProvider {
  upload: (name: string, data: Uint8Array) => Promise<string>
  download: (path: string) => Promise<Uint8Array | null>
  delete: (path: string) => Promise<boolean>
  url: (path: string) => string
}

export function createStorageProvider(config: StorageDef): StorageProvider {
  const { provider = "local" } = config
  switch (provider) {
    case "local":
      return createLocalStorage()
    case "s3":
      return createS3Storage(config)
    default:
      return createLocalStorage()
  }
}

function createLocalStorage(): StorageProvider {
  return {
    upload: async (name, data) => {
      const { writeFileSync, mkdirSync } = await import("fs")
      const { join } = await import("path")
      const dir = join(process.cwd(), "public", "uploads")
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, name), data)
      return "/uploads/" + name
    },
    download: async (path) => {
      try {
        const { readFile } = await import("fs/promises")
        return await readFile(path)
      } catch { return null }
    },
    delete: async (path) => {
      try {
        const { unlinkSync } = await import("fs")
        unlinkSync(path)
        return true
      } catch { return false }
    },
    url: (path) => path.startsWith("http") ? path : "/uploads/" + path,
  }
}

function createS3Storage(config: StorageDef): StorageProvider {
  return {
    upload: async (name) => name,
    download: async () => null,
    delete: async () => true,
    url: (path) => path,
  }
}
