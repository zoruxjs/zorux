import { z } from 'zod'

const fieldDefSchema = z.union([
  z.string(),
  z.object({
    type: z.string(),
    required: z.boolean().optional(),
    unique: z.boolean().optional(),
    default: z.any().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.string()).optional(),
  }),
])

const fieldPolicySchema = z.object({
  field: z.string(),
  readable: z.string().optional(),
  writable: z.string().optional(),
})

const derivedRoleSchema = z.object({
  name: z.string(),
  condition: z.string(),
})

const policySchema = z.record(z.string(), z.string()).optional()

const modelDefSchema = z.object({
  fields: z.record(z.string(), fieldDefSchema),
  auth: z.string().optional(),
  timestamps: z.boolean().optional().default(true),
  policies: policySchema,
  fieldPolicies: z.array(fieldPolicySchema).optional(),
  derivedRoles: z.array(derivedRoleSchema).optional(),
  scoped: z.boolean().optional(),
  id: z.enum(['int', 'uuid']).optional(),
  softDelete: z.boolean().optional(),
})

const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  redirectUri: z.string().optional(),
}).optional()

const socialProvidersSchema = z.object({
  apple: oauthProviderSchema, atlassian: oauthProviderSchema, cognito: oauthProviderSchema,
  discord: oauthProviderSchema, dropbox: oauthProviderSchema, facebook: oauthProviderSchema,
  figma: oauthProviderSchema, github: oauthProviderSchema, gitlab: oauthProviderSchema,
  google: oauthProviderSchema, huggingface: oauthProviderSchema, kakao: oauthProviderSchema,
  kick: oauthProviderSchema, line: oauthProviderSchema, linear: oauthProviderSchema,
  linkedin: oauthProviderSchema, microsoft: oauthProviderSchema, naver: oauthProviderSchema,
  notion: oauthProviderSchema, paybin: oauthProviderSchema, paypal: oauthProviderSchema,
  polar: oauthProviderSchema, railway: oauthProviderSchema, reddit: oauthProviderSchema,
  roblox: oauthProviderSchema, salesforce: oauthProviderSchema, slack: oauthProviderSchema,
  spotify: oauthProviderSchema, tiktok: oauthProviderSchema, twitch: oauthProviderSchema,
  twitter: oauthProviderSchema, vercel: oauthProviderSchema, vk: oauthProviderSchema,
  wechat: oauthProviderSchema, zoom: oauthProviderSchema,
}).optional()

const authDefSchema = z.object({
  model: z.string(),
  registration: z.enum(['open', 'invite', 'admin']).optional().default('open'),
  roles: z.array(z.string()).optional(),
  defaultRole: z.string().optional(),
  social: socialProvidersSchema,
  organization: z.object({
    enabled: z.boolean().optional().default(true),
    roles: z.array(z.string()).optional().default(['owner', 'admin', 'member']),
    inviteExpiresIn: z.number().optional().default(7),
  }).optional(),
}).optional()

const routeDefSchema = z.record(z.string(), z.string())

const realtimeDefSchema = z.object({
  enabled: z.boolean().optional().default(false),
  channels: z.record(z.string(), z.string()).optional(),
}).optional()

const themeDefSchema = z.object({
  primary: z.string().optional(),
  mode: z.enum(['light', 'dark', 'auto']).optional().default('auto'),
  font: z.string().optional(),
  radius: z.string().optional(),
}).optional()

export const appConfigSchema = z.object({
  name: z.string(),
  type: z.enum(['api', 'web', 'mobile', 'fullstack']).optional().default('api'),
  provider: z.string().optional(),
  database: z.object({
    provider: z.enum(['sqlite', 'postgres', 'mysql', 'mongodb', 'cloudflare-d1', 'cf-d1']).optional().default('sqlite'),
    url: z.string().optional(),
  }).optional().default({ provider: 'sqlite' }),
  models: z.record(z.string(), modelDefSchema),
  auth: authDefSchema,
  routes: z.record(z.string(), routeDefSchema).optional(),
  realtime: realtimeDefSchema,
  theme: themeDefSchema,
  supabase: z.object({
    url: z.string().optional(),
    anonKey: z.string().optional(),
    serviceKey: z.string().optional(),
  }).optional(),
  storage: z.object({
    provider: z.enum(['local', 's3']).optional().default('local'),
    s3: z.object({
      endpoint: z.string().optional(),
      region: z.string().optional(),
      bucket: z.string().optional(),
      accessKey: z.string().optional(),
      secretKey: z.string().optional(),
      publicUrl: z.boolean().optional(),
    }).optional(),
  }).optional(),
  plugins: z.array(z.string()).optional(),
  pluginConfig: z.record(z.string(), z.record(z.string(), z.any())).optional(),
  cache: z.object({
    provider: z.enum(['memory', 'redis', 'upstash', 'memcached', 'dynamodb', 'sqlite', 'cf-kv', 'cloudflare-kv', 'cf-do', 'durable-objects']).optional().default('memory'),
    url: z.string().optional(),
    ttl: z.number().optional().default(60),
  }).optional(),
  i18n: z.object({
    defaultLocale: z.string().optional().default('en'),
    locales: z.array(z.string()).optional().default(['en']),
    cookieName: z.string().optional().default('lang'),
  }).optional(),
  email: z.object({
    provider: z.string().optional(),
    from: z.string().optional(),
    resend: z.object({ apiKey: z.string().optional() }).optional(),
    sendgrid: z.object({ apiKey: z.string().optional() }).optional(),
  }).optional(),
})

export type ParsedFieldDef = z.infer<typeof fieldDefSchema>
