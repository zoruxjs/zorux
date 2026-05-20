import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { load, dump } from 'js-yaml'

interface NewOptions {
  preset?: string
  api?: boolean
  web?: boolean
  mobile?: boolean
  fullstack?: boolean
  saas?: boolean
  all?: boolean
  ui?: string
  minimal?: boolean
}

export async function newCommand(name: string, options: NewOptions) {
  const projectDir = join(process.cwd(), name)
  if (existsSync(projectDir)) {
    console.error('[Zorux] Directory ' + name + ' already exists')
    process.exit(1)
  }

  const preset = resolvePreset(options)
  console.log('\n  ⚡ Creating ' + preset + ' project: ' + name + '\n')

  // Load preset YAML
  const dir = import.meta.dir
  const presetDir = existsSync(join(dir, '../../presets'))
    ? join(dir, '../../presets')
    : join(dir, '../presets')  // bundled: dist/ → presets/
  const presetPath = join(presetDir, preset + '.yaml')
  const presetYaml = existsSync(presetPath)
    ? (load(readFileSync(presetPath, 'utf-8')) as any)
    : { features: {}, models: {} }

  // Create directories
  mkdirSync(join(projectDir, 'actions'), { recursive: true })
  mkdirSync(join(projectDir, 'public'), { recursive: true })
  mkdirSync(join(projectDir, 'jobs'), { recursive: true })

  const hasFrontend = preset !== 'api'
  if (hasFrontend) {
    mkdirSync(join(projectDir, 'web', 'pages'), { recursive: true })
    mkdirSync(join(projectDir, 'web', 'components'), { recursive: true })
    mkdirSync(join(projectDir, 'web', 'styles'), { recursive: true })
  }

  // Generate app.yaml
  writeFileSync(join(projectDir, 'app.yaml'), generateAppYaml(name, preset, presetYaml))

  // Generate package.json
  writeFileSync(join(projectDir, 'package.json'), JSON.stringify(generatePkg(name, options), null, 2))

  // tsconfig
  writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ESNext', module: 'ESNext', moduleResolution: 'bundler',
      strict: true, jsx: 'react-jsx', jsxImportSource: 'hono/jsx',
      types: ['bun-types'],
    },
    include: ['**/*.ts', '**/*.tsx'],
  }, null, 2))

  // .env
  const env = [
    '# Zorux - Environment',
    'PORT=3000',
    'JWT_SECRET=change-this-to-a-random-secret',
    '',
  ].join('\n')
  writeFileSync(join(projectDir, '.env'), env)
  writeFileSync(join(projectDir, '.env.example'), env)

  // Generate web pages
  if (hasFrontend && !options.minimal) {
    generateWebPages(projectDir, name, preset)
  }

  // Generate actions
  if (preset === 'saas') {
    generateSaaSExtras(projectDir, name)
  } else {
    writeFileSync(join(projectDir, 'actions', '.gitkeep'), '')
  }

  // Generate mobile for --all
  if (options.all) {
    try {
      const { genMobileCommand } = await import("./gen-mobile")
      console.log("  Generating mobile app...")
      genMobileCommand(projectDir)
    } catch (err: any) {
      console.log("  - Mobile generation error:", err.message)
    }
  }

  console.log('  ✅ Created ' + name + ' at ' + projectDir)
  console.log('\n  Next steps:')
  console.log('    cd ' + name)
  console.log('    bun install')
  console.log('    zorux dev\n')
}

function resolvePreset(opts: NewOptions): string {
  if (opts.preset) return opts.preset
  if (opts.all || opts.saas) return 'saas'
  if (opts.fullstack) return 'web'
  if (opts.web) return 'web'
  if (opts.mobile) return 'web'
  return 'api'
}

function generatePkg(name: string, options: NewOptions): any {
  const pkg: any = {
    name,
    type: 'module',
    scripts: { dev: 'zorux dev', build: 'zorux build', test: 'bun test' },
    dependencies: { zorux: 'latest', hono: '^4.5.0' },
    devDependencies: { 'bun-types': 'latest', typescript: '^5.5.0' },
  }
  if (options.ui && options.ui !== "default") {
    try {
      const deps = getUIDeps(options.ui)
      for (const dep of deps) pkg.dependencies[dep] = "*"
    } catch {}
  }
  return pkg
}

function getUIDeps(ui: string): string[] {
  const map: Record<string, string[]> = {
    tailwind: ['tailwindcss', '@tailwindcss/cli', 'daisyui'],
    daisyui: ['tailwindcss', '@tailwindcss/cli', 'daisyui'],
    antd: ['antd'],
    mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
  }
  return map[ui] || []
}

function generateAppYaml(name: string, preset: string, presetYaml: any): string {
  const type = preset === 'api' ? 'api' : 'fullstack'
  let yaml = `# ${name} - Zorux ${preset} app
name: ${name}
type: ${type}

database:
  provider: sqlite

`

  // Auth
  if (presetYaml.features?.auth) {
    const auth = presetYaml.auth || { model: 'User', registration: 'open' }
    yaml += `auth:
  model: ${auth.model || 'User'}
  registration: ${auth.registration || 'open'}
  roles: [${(auth.roles || ['admin', 'member']).join(', ')}]
`
    if (auth.organization?.enabled) {
      yaml += `  organization:
    enabled: true
    roles: [${(auth.organization.roles || ['owner', 'admin', 'member']).join(', ')}]
`
    }
    yaml += '\n'
  }

  // Models
  const models = presetYaml.models || {}
  const modelKeys = Object.keys(models)
  if (modelKeys.length > 0) {
    yaml += 'models:\n'
    for (const [mname, mdef] of Object.entries(models)) {
      const def = mdef as any
      yaml += `  ${mname}:\n`
      if (def.fields) {
        yaml += '    fields:\n'
        for (const [fname, ftype] of Object.entries(def.fields)) {
          yaml += `      ${fname}: ${ftype}\n`
        }
      }
      if (def.auth) yaml += `    auth: ${def.auth}\n`
      if (def.timestamps) yaml += `    timestamps: true\n`
      if (def.scoped) yaml += `    scoped: true\n`
      if (def.policies) {
        yaml += '    policies:\n'
        for (const [action, policy] of Object.entries(def.policies)) {
          yaml += `      ${action}: ${policy}\n`
        }
      }
    }
  } else if (preset === 'api') {
    yaml += `models:
  # Add your models here
  # Example:
  # User:
  #   fields:
  #     name: string required
  #     email: email unique
  #   auth: password
`
  }

  // Add optional feature blocks
  if (presetYaml.cache?.provider) yaml += `\ncache:\n  provider: ${presetYaml.cache.provider}\n`
  if (presetYaml.email?.provider) yaml += `\nemail:\n  provider: ${presetYaml.email.provider}\n  from: "noreply@${name}.com"\n`
  if (presetYaml.realtime?.enabled) yaml += `\nrealtime:\n  enabled: true\n`

  return yaml
}

function generateWebPages(projectDir: string, name: string, preset: string) {
  // Landing page (DaisyUI)
  writeFileSync(join(projectDir, 'web', 'pages', 'index.tsx'), `import type { FC } from "hono/jsx"

export const HomePage: FC<{ appName: string }> = ({ appName }) => (
  <div class="min-h-screen bg-base-200">
    <nav class="navbar bg-base-100/80 backdrop-blur border-b border-base-200 sticky top-0 z-20 px-6">
      <div class="flex-1 font-bold text-lg tracking-tight">{appName}</div>
      <div class="flex gap-2">
        <a href="/login" class="btn btn-soft btn-sm">Sign in</a>
        <a href="/register" class="btn btn-primary btn-sm">Get started</a>
      </div>
    </nav>
    <main>
      <section class="hero bg-base-100 py-24 px-6">
        <div class="hero-content text-center max-w-2xl mx-auto">
          <div>
            <div class="badge badge-soft badge-primary mb-4">Built with Zorux</div>
            <h1 class="text-5xl font-bold tracking-tight">{appName}</h1>
            <p class="text-lg opacity-60 mt-4 max-w-lg mx-auto">Full-stack SaaS powered by Zorux. One YAML file generates API, admin, auth, payments, and teams.</p>
            <a href="/register" class="btn btn-primary btn-lg mt-6">Get started →</a>
          </div>
        </div>
      </section>
      <section class="py-16 px-6 max-w-5xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card card-border bg-base-100">
            <div class="card-body">
              <h3 class="card-title">Team Management</h3>
              <p class="text-sm opacity-60">Invite members, assign roles, manage permissions across organizations.</p>
            </div>
          </div>
          <div class="card card-border bg-base-100">
            <div class="card-body">
              <h3 class="card-title">Subscriptions</h3>
              <p class="text-sm opacity-60">Stripe integration with plans, billing, and customer portal.</p>
            </div>
          </div>
          <div class="card card-border bg-base-100">
            <div class="card-body">
              <h3 class="card-title">API First</h3>
              <p class="text-sm opacity-60">REST API with Swagger docs, auto-generated from your models.</p>
            </div>
          </div>
        </div>
      </section>
      <footer class="text-center py-8 text-sm opacity-40 border-t border-base-200">
        <p>&copy; ${new Date().getFullYear()} {appName}. Built with Zorux.</p>
      </footer>
    </main>
  </div>
)
`)
}

function generateSaaSExtras(projectDir: string, name: string) {
  writeFileSync(join(projectDir, 'seed.ts'), `import { F } from "zorux"

export default async function seed() {
  console.log("  Seed data created!")
}
`)

  writeFileSync(join(projectDir, 'actions', 'billing.ts'), `import { F } from "zorux"

export const invoicePaid = {
  policy: "*",
  handler: async (c: any) => {
    const { email, amount } = await c.req.json()
    console.log(\`Invoice \${amount} paid by \${email}\`)
    return c.json({ success: true })
  },
}
`)

  writeFileSync(join(projectDir, 'jobs', 'subscriptions.ts'), `export default {
  name: "check-expired-subscriptions",
  async perform(_args: any) {
    console.log("Checking for expired subscriptions...")
  },
}
`)
}
