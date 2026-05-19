import type { DataCollection } from "../db"
import type { AppConfig, CompiledModel } from "../types"

export interface AuthInput {
  email: string
  password: string
  name?: string
  role?: string
}

export interface AuthResult {
  token: string
  user: { id: any; name: string; email: string; role?: string }
}

export interface AuthProvider {
  register(input: AuthInput): Promise<AuthResult>
  login(input: AuthInput): Promise<AuthResult>
  me(userId: any): Promise<{ id: any; name: string; email: string } | null>
  middleware(): (c: any, next: any) => Promise<any>
}

export interface RealtimeProvider {
  publish(topic: string, data: any): void
  subscribe(topic: string, callback: (data: any) => void): () => void
  websocket(): { open: Function; message: Function; close: Function } | undefined
}

export interface StorageProvider {
  upload(name: string, data: Uint8Array | Blob): Promise<string>
  url(path: string): string
}

export interface PlatformAdapter {
  name: string
  config: AppConfig
  models: CompiledModel[]
  database: {
    collection(tableName: string, model?: CompiledModel): DataCollection
    close(): void
    run?(sql: string, params?: any[]): void
    get?(sql: string, params?: any[]): any
    all?(sql: string, params?: any[]): any[]
  }
  auth: AuthProvider
  realtime: RealtimeProvider
  storage: StorageProvider
}
