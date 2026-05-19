import { mkdirSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

// Scaffold templates for different project types
const SCAFFOLDS: Record<string, { yaml: string; description: string }> = {
  forum: {
    description: "Forum with posts, comments, and categories",
    yaml: `name: "{name}"
type: fullstack
provider: Zorux

auth:
  model: User
  registration: open
  roles: [admin, moderator, member]
  defaultRole: member

database:
  provider: sqlite

models:
  User:
    fields:
      name: string required min:2
      email: string unique
    auth: password
    policies:
      list: admin
      read: authenticated
      update: owner
      delete: admin

  Category:
    fields:
      name: string required unique
      description: text
      color: string
    policies:
      list: "*"
      read: "*"
      create: admin
      update: admin
      delete: admin
    seed: 5

  Post:
    fields:
      title: string required min:5 max:200
      body: text required
      status: string enum:draft,published,archived
      author: User
      category: Category
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: authenticated
      update: owner
      delete: admin,moderator
    seed: 20

  Comment:
    fields:
      content: string required min:1 max:1000
      author: User
      post: Post
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: authenticated
      update: owner
      delete: admin,moderator
    seed: 50
`,
  },
  blog: {
    description: "Blog with posts, tags, and newsletter",
    yaml: `name: "{name}"
type: fullstack
provider: Zorux

auth:
  model: User
  registration: open
  roles: [admin, author]
  defaultRole: author

database:
  provider: sqlite

models:
  User:
    fields:
      name: string required
      email: string unique
      bio: text
      avatar: file
    auth: password
    policies:
      list: "*"
      read: "*"
      update: owner
      delete: admin

  Post:
    fields:
      title: string required min:5
      slug: string unique
      body: text required
      excerpt: text
      coverImage: file
      status: string enum:draft,published
      author: User
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: admin,author
      update: owner
      delete: admin
    seed: 15

  Tag:
    fields:
      name: string required unique
      color: string
    policies:
      list: "*"
      read: "*"
      create: admin
      update: admin
      delete: admin
    seed: 8
`,
  },
  ecommerce: {
    description: "E-commerce with products, orders, and cart",
    yaml: `name: "{name}"
type: fullstack
provider: Zorux

auth:
  model: User
  registration: open
  roles: [admin, customer]
  defaultRole: customer

database:
  provider: sqlite

models:
  User:
    fields:
      name: string required
      email: string unique
      address: text
    auth: password
    policies:
      list: admin
      read: authenticated
      update: owner
      delete: admin

  Product:
    fields:
      name: string required
      description: text
      price: float required min:0
      stock: int required min:0
      image: file
      status: string enum:active,inactive
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: admin
      update: admin
      delete: admin
    seed: 25

  Order:
    fields:
      status: string enum:pending,paid,shipped,delivered,canceled
      total: float required
      customer: User
    timestamps: true
    scoped: true
    policies:
      list: admin
      read: owner
      update: admin
      delete: admin

  OrderItem:
    fields:
      quantity: int required min:1
      price: float required
      order: Order
      product: Product
    policies:
      list: admin
      read: authenticated
      create: authenticated
      update: admin
      delete: admin
`,
  },
  saas: {
    description: "SaaS with organizations, subscriptions, and teams",
    yaml: `name: "{name}"
type: fullstack
provider: Zorux

auth:
  model: User
  registration: open
  roles: [admin, viewer]
  defaultRole: viewer
  organization:
    enabled: true
    roles: [owner, admin, member]
    inviteExpiresIn: 7

database:
  provider: sqlite

models:
  User:
    fields:
      name: string required min:2
      email: string unique
    auth: password
    policies:
      list: admin
      read: authenticated
      update: owner
      delete: admin

  Project:
    fields:
      name: string required
      description: text
      org: Organization
    timestamps: true
    scoped: true
    policies:
      list: authenticated
      read: authenticated
      create: authenticated
      update: owner
      delete: admin

  Subscription:
    fields:
      plan: string enum:free,pro,enterprise
      status: string enum:active,canceled,past_due
      stripeCustomerId: string
      stripeSubscriptionId: string
      org: Organization
    timestamps: true
    scoped: true
    policies:
      list: admin
      read: authenticated
      update: admin
      delete: admin
`,
  },
}

export async function scaffoldCommand(args: string[]) {
  const type = args[1]
  const name = args[2] || type

  if (!type || !SCAFFOLDS[type]) {
    console.log("\n  Available scaffolds:")
    console.log("")
    for (const [key, scaffold] of Object.entries(SCAFFOLDS)) {
      console.log("    " + key.padEnd(15) + scaffold.description)
    }
    console.log("")
    console.log("zorux scaffold <type> [name]")
    console.log("zorux scaffold forum my-forum")
    console.log("")
    return
  }

  const scaffold = SCAFFOLDS[type]
  const projectDir = join(process.cwd(), name)

  if (existsSync(projectDir)) {
    console.error("[Zorux] Directory '" + name + "' already exists")
    process.exit(1)
  }

  console.log('\n  \u26a1 Scaffolding ' + type + ': ' + name + '\n')

  // Create project structure
  mkdirSync(join(projectDir, "actions"), { recursive: true })
  mkdirSync(join(projectDir, "jobs"), { recursive: true })
  mkdirSync(join(projectDir, "public"), { recursive: true })

  // Write YAML
  const yamlContent = scaffold.yaml.replace(/\{name\}/g, name)
  writeFileSync(join(projectDir, "app.yaml"), yamlContent)

  // Package.json
  writeFileSync(join(projectDir, "package.json"), JSON.stringify({
    name,
    type: "module",
    scripts: { dev: "fw dev", build: "fw build", test: "bun test tests/integration" },
    dependencies: { Zorux: "^0.1.0", hono: "^4.5.0", zod: "^3.23.0" },
    devDependencies: { "bun-types": "latest", typescript: "^5.5.0" },
  }, null, 2))

  // tsconfig
  writeFileSync(join(projectDir, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ESNext", module: "ESNext", moduleResolution: "bundler",
      strict: true, jsx: "react-jsx", jsxImportSource: "hono/jsx",
      types: ["bun-types"],
    },
    include: ["**/*.ts", "**/*.tsx"],
  }, null, 2))

  // .env
  writeFileSync(join(projectDir, ".env"), [
    "# " + name + " - Zorux " + type,
    "PORT=3000",
    "JWT_SECRET=change-this-to-a-random-secret",
    "EMAIL_PROVIDER=fake",
    'EMAIL_FROM=noreply@' + name + '.com',
  ].join("\n"))

  console.log("  \u2705 Created project: " + name)
  console.log("  \u2705 Models: " + Object.keys(scaffold.yaml.match(/^\s+\w+:\n\s+fields:/gm)?.reduce((acc: any) => { acc.push(""); return acc }, []) || []).length + " models")

  // Generate mobile
  try {
    const { genMobileCommand } = await import("./gen-mobile")
    genMobileCommand(projectDir)
  } catch {}

  // Generate tests
  try {
    const { testCommand } = await import("./test")
    const origCwd = process.cwd()
    process.chdir(projectDir)
    testCommand(["test"])
    process.chdir(origCwd)
  } catch {}

  console.log("\n  Next steps:")
  console.log("    cd " + name)
  console.log("zorux dev")
  console.log("")
}
