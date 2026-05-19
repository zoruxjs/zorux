import type { PluginConfig } from "./plugin/types"

export type { PluginConfig }

export interface FieldDef {
  type: string
  required?: boolean
  unique?: boolean
  default?: unknown
  min?: number
  max?: number
  pattern?: string
  enum?: string[]
}

export interface ModelDef {
  fields: Record<string, FieldDef>
  auth?: string
  timestamps: boolean
  policies?: Record<string, string>
  fieldPolicies?: FieldPolicyDef[]
  derivedRoles?: { name: string; condition: string }[]
  scoped?: boolean
  id?: 'int' | 'uuid'
  softDelete?: boolean
}

export interface OAuthProviderConfigDef {
  clientId?: string
  clientSecret?: string
  redirectUri?: string
}

export type SocialProvider =
  | "apple" | "atlassian" | "cognito" | "discord" | "dropbox" | "facebook"
  | "figma" | "github" | "gitlab" | "google" | "huggingface" | "kakao"
  | "kick" | "line" | "linear" | "linkedin" | "microsoft" | "naver"
  | "notion" | "paybin" | "paypal" | "polar" | "railway" | "reddit"
  | "roblox" | "salesforce" | "slack" | "spotify" | "tiktok" | "twitch"
  | "twitter" | "vercel" | "vk" | "wechat" | "zoom"

export interface OrgDef {
  enabled: boolean
  roles?: string[]
  inviteExpiresIn?: number
}

export interface AuthDef {
  model: string
  registration: 'open' | 'invite' | 'admin'
  roles?: string[]
  defaultRole?: string
  social?: Partial<Record<SocialProvider, OAuthProviderConfigDef>>
  organization?: OrgDef
}

export interface DatabaseDef {
  provider: 'sqlite' | 'postgres' | 'mysql' | 'mongodb' | 'cloudflare-d1' | 'cf-d1'
  url?: string
}

export interface RealtimeDef {
  enabled: boolean
  channels?: Record<string, string>
}

export interface ThemeDef {
  primary?: string
  mode: 'light' | 'dark' | 'auto'
  font?: string
  radius?: string
}

export interface CacheDef {
  provider?: 'memory' | 'redis' | 'upstash' | 'memcached' | 'dynamodb' | 'sqlite' | 'cf-kv' | 'cloudflare-kv' | 'cf-do' | 'durable-objects'
  url?: string
  ttl?: number
}

export interface I18nDef {
  defaultLocale?: string
  locales?: string[]
  cookieName?: string
}

export interface SupabaseDef {
  url?: string
  anonKey?: string
  serviceKey?: string
}

export interface StorageDef {
  provider: 'local' | 's3'
  s3?: S3Def
}

export interface S3Def {
  endpoint?: string
  region?: string
  bucket?: string
  accessKey?: string
  secretKey?: string
  publicUrl?: boolean
}

export interface EmailDef {
  provider?: string
  from?: string
  resend?: { apiKey?: string }
  sendgrid?: { apiKey?: string }
}

export interface AppConfig {
  name: string
  type: 'api' | 'web' | 'mobile' | 'fullstack'
  provider?: string
  database: DatabaseDef
  storage?: StorageDef
  email?: EmailDef
  cache?: CacheDef
  i18n?: I18nDef
  models: Record<string, ModelDef>
  plugins?: string[]
  pluginConfig?: PluginConfig
  auth?: AuthDef
  routes?: Record<string, Record<string, string>>
  realtime?: RealtimeDef
  theme?: ThemeDef
  supabase?: SupabaseDef
}

export interface CompiledField {
  name: string
  type: string
  isRequired: boolean
  isUnique: boolean
  defaultValue: unknown
  min?: number
  max?: number
  pattern?: string
  enum?: string[]
  isRelation: boolean
  relationModel?: string
  relationType?: 'belongsTo' | 'hasMany' | 'manyToMany'
}

export interface FieldPolicyDef {
  field: string
  readable?: string
  writable?: string
}

export interface CompiledModel {
  name: string
  plural: string
  tableName: string
  fields: CompiledField[]
  hasAuth: boolean
  hasTimestamps: boolean
  policies?: Record<string, string>
  fieldPolicies?: FieldPolicyDef[]
  derivedRoles?: { name: string; condition: string }[]
  ownerField?: string
  isScoped?: boolean
  idType?: 'int' | 'uuid'
  softDelete?: boolean
}

export interface CompiledRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  policy: string
  handlerType: 'crud' | 'action' | 'auth'
}
