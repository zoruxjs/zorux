import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs"
import { join } from "path"

// Scaffold templates for different project types
const SCAFFOLDS: Record<string, { yaml: string; actions: Record<string, string>; description: string }> = {
  forum: {
    description: "Forum with posts, comments, categories, and moderation",
    yaml: `name: "{name}"
type: fullstack
provider: Zorux

auth:
  model: User
  registration: open
  roles: [admin, moderator, member]
  defaultRole: member
  passwordMinLength: 8
  social:
    google:
      clientId: \${GOOGLE_CLIENT_ID}
      clientSecret: \${GOOGLE_CLIENT_SECRET}
    github:
      clientId: \${GITHUB_CLIENT_ID}
      clientSecret: \${GITHUB_CLIENT_SECRET}

database:
  provider: sqlite

cache:
  provider: memory
  ttl: 120

realtime:
  enabled: true

email:
  provider: fake
  from: "noreply@{name}.com"

search:
  provider: meilisearch
  url: http://localhost:7700

i18n:
  defaultLocale: en
  locales: [en, pt-BR, es]

theme:
  framework: tailwind
  primary: "#6366f1"
  mode: dark

models:
  User:
    fields:
      name: string required min:2 max:50
      email: string unique
      avatar: file
      bio: text
      reputation: int default:0 min:0
    auth: password
    timestamps: true
    policies:
      list: admin
      read: authenticated
      update: owner
      delete: admin

  Category:
    fields:
      name: string required unique max:100
      slug: string unique
      description: text
      color: string default:"#6366f1"
      icon: string
      postCount: int default:0
    timestamps: true
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
      slug: string unique
      body: text required
      status: string enum:draft,published,pinned,locked,archived default:published
      views: int default:0
      author: User
      category: Category
      lastReply: User
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: authenticated
      update: owner
      delete: "user.role == 'admin' || user.role == 'moderator'"
    seed: 20

  Comment:
    fields:
      content: string required min:1 max:5000
      author: User
      post: Post
      isSolution: bool default:false
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: authenticated
      update: owner
      delete: "user.role == 'admin' || user.role == 'moderator' || resource.authorId == user.id"
    seed: 50

  Vote:
    fields:
      value: int required min:-1 max:1
      user: User
      post: Post
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: authenticated
      update: owner
      delete: owner

  Report:
    fields:
      reason: string required
      details: text
      status: string enum:pending,reviewed,resolved default:pending
      reporter: User
      post: Post
      comment: Comment
    timestamps: true
    policies:
      list: "user.role == 'admin' || user.role == 'moderator'"
      read: "user.role == 'admin' || user.role == 'moderator'"
      create: authenticated
      update: "user.role == 'admin' || user.role == 'moderator'"
      delete: admin
`,
    actions: {
      posts: `export const trending = F.public(async (ctx) => {
  const db = ctx.get("db")
  const posts = await db.query(\`
    SELECT p.*, u.name as author_name, c.name as category_name
    FROM posts p
    LEFT JOIN users u ON p.authorId = u.id
    LEFT JOIN categories c ON p.categoryId = c.id
    WHERE p.status = 'published'
    ORDER BY p.views DESC, p.updated_at DESC
    LIMIT 20
  \`)
  return F.json(posts)
})

export const mark_solution = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const { postId, commentId } = await ctx.req.json()
  await db.prepare("UPDATE comments SET isSolution = 0 WHERE postId = ?").run(postId)
  await db.prepare("UPDATE comments SET isSolution = 1 WHERE id = ?").run(commentId)
  return F.json({ success: true })
})`,
      users: `export const reputation = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const user = ctx.get("user")
  const row = await db.prepare("SELECT reputation FROM users WHERE id = ?").get(user.id)
  return F.json({ reputation: row?.reputation || 0 })
})

export const award_reputation = F.role("admin").run(async (ctx) => {
  const db = ctx.get("db")
  const { userId, amount } = await ctx.req.json()
  await db.prepare("UPDATE users SET reputation = reputation + ? WHERE id = ?").run(amount, userId)
  return F.json({ success: true })
})`,
    },
  },
  blog: {
    description: "Blog with posts, tags, newsletter, and SEO",
    yaml: `name: "{name}"
type: fullstack
provider: Zorux

auth:
  model: User
  registration: open
  roles: [admin, author, subscriber]
  defaultRole: author
  passwordMinLength: 8
  social:
    google:
      clientId: \${GOOGLE_CLIENT_ID}
      clientSecret: \${GOOGLE_CLIENT_SECRET}
    github:
      clientId: \${GITHUB_CLIENT_ID}
      clientSecret: \${GITHUB_CLIENT_SECRET}

database:
  provider: sqlite

cache:
  provider: memory
  ttl: 300

realtime:
  enabled: true

email:
  provider: fake
  from: "noreply@{name}.com"

search:
  provider: meilisearch
  url: http://localhost:7700

i18n:
  defaultLocale: en
  locales: [en, pt-BR, es, fr]

theme:
  framework: tailwind
  primary: "#f59e0b"
  mode: light

models:
  User:
    fields:
      name: string required min:2 max:50
      email: string unique
      avatar: file
      bio: text
      website: string
      role: string enum:admin,author,subscriber default:subscriber
    auth: password
    timestamps: true
    policies:
      list: "*"
      read: "*"
      update: owner
      delete: admin

  Post:
    fields:
      title: string required min:5 max:200
      slug: string unique
      excerpt: text max:500
      body: text required
      coverImage: file
      status: string enum:draft,published,scheduled default:draft
      publishedAt: string
      readTime: int default:5
      views: int default:0
      author: User
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: "user.role == 'admin' || user.role == 'author'"
      update: owner
      delete: admin
    seed: 15

  Tag:
    fields:
      name: string required unique max:50
      slug: string unique
      color: string default:"#6366f1"
      postCount: int default:0
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: admin
      update: admin
      delete: admin
    seed: 8

  Comment:
    fields:
      content: string required min:1 max:2000
      author: User
      post: Post
      approved: bool default:false
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: authenticated
      update: "user.role == 'admin' || resource.authorId == user.id"
      delete: "user.role == 'admin' || resource.authorId == user.id"

  Newsletter:
    fields:
      email: string required unique
      name: string
      subscribed: bool default:true
      unsubscribedAt: string
    timestamps: true
    policies:
      list: admin
      read: admin
      create: "*"
      update: admin
      delete: admin

  Media:
    fields:
      filename: string required
      originalName: string
      mimeType: string
      size: int
      url: string
      uploadedBy: User
    timestamps: true
    policies:
      list: authenticated
      read: authenticated
      create: authenticated
      update: admin
      delete: admin
`,
    actions: {
      posts: `export const publish = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const { id } = ctx.req.param()
  const user = ctx.get("user")
  const post = await db.prepare("SELECT * FROM posts WHERE id = ?").get(id)
  if (!post) return F.json({ error: "Not found" }, 404)
  if (post.authorId !== user.id && user.role !== "admin") return F.json({ error: "Forbidden" }, 403)
  await db.prepare("UPDATE posts SET status = 'published', publishedAt = datetime('now') WHERE id = ?").run(id)
  return F.json({ success: true })
})

export const increment_views = F.public(async (ctx) => {
  const db = ctx.get("db")
  const { id } = ctx.req.param()
  await db.prepare("UPDATE posts SET views = views + 1 WHERE id = ?").run(id)
  return F.json({ success: true })
})

export const by_tag = F.public(async (ctx) => {
  const db = ctx.get("db")
  const { tag } = ctx.req.param()
  const posts = await db.query(\`
    SELECT p.*, u.name as author_name
    FROM posts p
    JOIN users u ON p.authorId = u.id
    JOIN post_tags pt ON pt.postId = p.id
    JOIN tags t ON t.id = pt.tagId
    WHERE t.slug = ? AND p.status = 'published'
    ORDER BY p.publishedAt DESC
  \`, [tag])
  return F.json(posts)
})`,
      newsletter: `export const subscribe = F.public(async (ctx) => {
  const db = ctx.get("db")
  const { email, name } = await ctx.req.json()
  try {
    await db.prepare("INSERT INTO newsletters (email, name, subscribed) VALUES (?, ?, 1)").run(email, name || "")
    return F.json({ success: true })
  } catch {
    return F.json({ error: "Already subscribed" }, 409)
  }
})

export const unsubscribe = F.public(async (ctx) => {
  const db = ctx.get("db")
  const { token } = ctx.req.param()
  await db.prepare("UPDATE newsletters SET subscribed = 0, unsubscribedAt = datetime('now') WHERE email = ?").run(token)
  return F.json({ success: true })
})

export const send_digest = F.role("admin").run(async (ctx) => {
  const db = ctx.get("db")
  const subscribers = await db.prepare("SELECT email, name FROM newsletters WHERE subscribed = 1").all()
  const posts = await db.prepare("SELECT title, slug FROM posts WHERE status = 'published' ORDER BY publishedAt DESC LIMIT 5").all()
  return F.json({ sent: subscribers.length, posts: posts.length })
})`,
    },
  },
  ecommerce: {
    description: "E-commerce with products, orders, cart, and payments",
    yaml: `name: "{name}"
type: fullstack
provider: Zorux

auth:
  model: User
  registration: open
  roles: [admin, customer]
  defaultRole: customer
  passwordMinLength: 8
  social:
    google:
      clientId: \${GOOGLE_CLIENT_ID}
      clientSecret: \${GOOGLE_CLIENT_SECRET}

database:
  provider: sqlite

cache:
  provider: memory
  ttl: 60

realtime:
  enabled: true

email:
  provider: fake
  from: "orders@{name}.com"

payments:
  provider: stripe
  stripe:
    secretKey: \${STRIPE_SECRET_KEY}
    webhookSecret: \${STRIPE_WEBHOOK_SECRET}

storage:
  provider: local

search:
  provider: meilisearch
  url: http://localhost:7700

i18n:
  defaultLocale: en
  locales: [en, pt-BR, es]

theme:
  framework: tailwind
  primary: "#10b981"
  mode: light

models:
  User:
    fields:
      name: string required min:2
      email: string unique
      phone: string
      address: text
      city: string
      country: string default:"US"
      stripeCustomerId: string
    auth: password
    timestamps: true
    policies:
      list: admin
      read: "user.role == 'admin' || resource.id == user.id"
      update: owner
      delete: admin

  Product:
    fields:
      name: string required min:3 max:200
      slug: string unique
      description: text
      price: float required min:0
      comparePrice: float
      cost: float
      sku: string unique
      barcode: string
      stock: int required min:0 default:0
      status: string enum:active,draft,archived default:active
      image: file
      category: Category
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: admin
      update: admin
      delete: admin
    seed: 25

  Category:
    fields:
      name: string required unique
      slug: string unique
      description: text
      image: file
      parentId: int
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: admin
      update: admin
      delete: admin
    seed: 5

  Order:
    fields:
      orderNumber: string unique
      status: string enum:pending,paid,processing,shipped,delivered,canceled,refunded default:pending
      subtotal: float required
      tax: float default:0
      shipping: float default:0
      total: float required
      paymentMethod: string
      paymentStatus: string enum:pending,paid,failed,refunded default:pending
      shippingAddress: text
      notes: text
      customer: User
      stripePaymentIntentId: string
    timestamps: true
    scoped: true
    policies:
      list: "user.role == 'admin'"
      read: owner
      update: admin
      delete: admin

  OrderItem:
    fields:
      quantity: int required min:1
      price: float required
      total: float required
      order: Order
      product: Product
    policies:
      list: admin
      read: authenticated
      create: authenticated
      update: admin
      delete: admin

  Cart:
    fields:
      sessionId: string unique
      user: User
    timestamps: true
    policies:
      list: owner
      read: owner
      create: authenticated
      update: owner
      delete: owner

  CartItem:
    fields:
      quantity: int required min:1
      cart: Cart
      product: Product
    policies:
      list: owner
      read: owner
      create: authenticated
      update: owner
      delete: owner

  Review:
    fields:
      rating: int required min:1 max:5
      title: string max:100
      content: text
      approved: bool default:false
      author: User
      product: Product
    timestamps: true
    policies:
      list: "*"
      read: "*"
      create: authenticated
      update: "user.role == 'admin' || resource.authorId == user.id"
      delete: admin

  Coupon:
    fields:
      code: string required unique
      type: string enum:percent,fixed default:percent
      value: float required min:0
      minOrder: float default:0
      maxUses: int
      usedCount: int default:0
      expiresAt: string
      active: bool default:true
    timestamps: true
    policies:
      list: admin
      read: admin
      create: admin
      update: admin
      delete: admin
`,
    actions: {
      cart: `export const get_cart = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const user = ctx.get("user")
  let cart = await db.prepare("SELECT * FROM carts WHERE userId = ?").get(user.id)
  if (!cart) {
    const result = await db.prepare("INSERT INTO carts (userId, sessionId) VALUES (?, ?)").run(user.id, "user-" + user.id)
    cart = await db.prepare("SELECT * FROM carts WHERE id = ?").get(result.lastInsertRowid)
  }
  const items = await db.query(\`
    SELECT ci.*, p.name, p.price, p.image
    FROM cart_items ci
    JOIN products p ON ci.productId = p.id
    WHERE ci.cartId = ?
  \`, [cart.id])
  return F.json({ cart, items })
})

export const add_item = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const user = ctx.get("user")
  const { productId, quantity } = await ctx.req.json()
  const cart = await db.prepare("SELECT * FROM carts WHERE userId = ?").get(user.id)
  if (!cart) return F.json({ error: "Cart not found" }, 404)
  const product = await db.prepare("SELECT * FROM products WHERE id = ?").get(productId)
  if (!product || product.stock < quantity) return F.json({ error: "Insufficient stock" }, 400)
  const existing = await db.prepare("SELECT * FROM cart_items WHERE cartId = ? AND productId = ?").get(cart.id, productId)
  if (existing) {
    await db.prepare("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?").run(quantity, existing.id)
  } else {
    await db.prepare("INSERT INTO cart_items (cartId, productId, quantity) VALUES (?, ?, ?)").run(cart.id, productId, quantity)
  }
  return F.json({ success: true })
})

export const remove_item = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const { itemId } = ctx.req.param()
  await db.prepare("DELETE FROM cart_items WHERE id = ?").run(itemId)
  return F.json({ success: true })
})

export const checkout = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const user = ctx.get("user")
  const cart = await db.prepare("SELECT * FROM carts WHERE userId = ?").get(user.id)
  if (!cart) return F.json({ error: "Cart not found" }, 404)
  const items = await db.query(\`
    SELECT ci.*, p.price, p.stock
    FROM cart_items ci
    JOIN products p ON ci.productId = p.id
    WHERE ci.cartId = ?
  \`, [cart.id])
  if (items.length === 0) return F.json({ error: "Cart is empty" }, 400)
  let subtotal = 0
  for (const item of items) {
    if (item.stock < item.quantity) return F.json({ error: "Insufficient stock for " + item.name }, 400)
    subtotal += item.price * item.quantity
  }
  const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase()
  const order = await db.prepare(\`
    INSERT INTO orders (orderNumber, userId, status, subtotal, total, paymentStatus)
    VALUES (?, ?, 'pending', ?, ?, 'pending')
  \`).run(orderNumber, user.id, subtotal, subtotal)
  const orderId = order.lastInsertRowid
  for (const item of items) {
    await db.prepare(\`
      INSERT INTO order_items (orderId, productId, quantity, price, total)
      VALUES (?, ?, ?, ?, ?)
    \`).run(orderId, item.productId, item.quantity, item.price, item.price * item.quantity)
    await db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.productId)
  }
  await db.prepare("DELETE FROM cart_items WHERE cartId = ?").run(cart.id)
  return F.json({ success: true, orderId, orderNumber })
})`,
      products: `export const search_products = F.public(async (ctx) => {
  const db = ctx.get("db")
  const { q } = ctx.req.query()
  if (!q) return F.json({ error: "Query required" }, 400)
  const products = await db.query(\`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.categoryId = c.id
    WHERE p.status = 'active' AND (
      p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?
    )
    ORDER BY p.name
    LIMIT 50
  \`, [\`%\${q}%\`, \`%\${q}%\`, \`%\${q}%\`])
  return F.json(products)
})

export const low_stock = F.role("admin").run(async (ctx) => {
  const db = ctx.get("db")
  const { threshold } = ctx.req.query()
  const products = await db.prepare("SELECT * FROM products WHERE stock <= ? AND status = 'active' ORDER BY stock ASC").all(Number(threshold) || 5)
  return F.json(products)
})`,
      coupons: `export const validate = F.public(async (ctx) => {
  const db = ctx.get("db")
  const { code } = await ctx.req.json()
  const coupon = await db.prepare("SELECT * FROM coupons WHERE code = ? AND active = 1").get(code)
  if (!coupon) return F.json({ valid: false, error: "Invalid coupon" })
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return F.json({ valid: false, error: "Expired" })
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return F.json({ valid: false, error: "Max uses reached" })
  return F.json({ valid: true, type: coupon.type, value: coupon.value })
})`,
    },
  },
  saas: {
    description: "SaaS with organizations, subscriptions, teams, and billing",
    yaml: `name: "{name}"
type: fullstack
provider: Zorux

auth:
  model: User
  registration: open
  roles: [admin, user]
  defaultRole: user
  passwordMinLength: 8
  organization:
    enabled: true
    roles: [owner, admin, member, viewer]
    inviteExpiresIn: 7
  social:
    google:
      clientId: \${GOOGLE_CLIENT_ID}
      clientSecret: \${GOOGLE_CLIENT_SECRET}
    github:
      clientId: \${GITHUB_CLIENT_ID}
      clientSecret: \${GITHUB_CLIENT_SECRET}

database:
  provider: sqlite

cache:
  provider: memory
  ttl: 120

realtime:
  enabled: true

email:
  provider: fake
  from: "hello@{name}.com"

payments:
  provider: stripe
  stripe:
    secretKey: \${STRIPE_SECRET_KEY}
    webhookSecret: \${STRIPE_WEBHOOK_SECRET}

storage:
  provider: local

search:
  provider: meilisearch
  url: http://localhost:7700

i18n:
  defaultLocale: en
  locales: [en, pt-BR, es, fr, de]

theme:
  framework: tailwind
  primary: "#3b82f6"
  mode: dark

models:
  User:
    fields:
      name: string required min:2 max:50
      email: string unique
      avatar: file
      title: string
      timezone: string default:"UTC"
    auth: password
    timestamps: true
    policies:
      list: admin
      read: authenticated
      update: owner
      delete: admin

  Organization:
    fields:
      name: string required min:2 max:100
      slug: string unique
      plan: string enum:free,starter,pro,enterprise default:free
      stripeCustomerId: string
      stripeSubscriptionId: string
      subscriptionStatus: string enum:active,canceled,past_due,trialing default:active
      trialEndsAt: string
      domain: string
      logo: file
    timestamps: true
    policies:
      list: authenticated
      read: authenticated
      create: authenticated
      update: "user.role == 'admin'"
      delete: "user.role == 'admin'"

  Project:
    fields:
      name: string required min:2 max:100
      slug: string unique
      description: text
      status: string enum:active,archived default:active
      org: Organization
      owner: User
    timestamps: true
    scoped: true
    policies:
      list: authenticated
      read: authenticated
      create: authenticated
      update: owner
      delete: "user.role == 'admin' || resource.ownerId == user.id"

  ApiKey:
    fields:
      name: string required
      key: string unique
      prefix: string
      lastUsedAt: string
      expiresAt: string
      org: Organization
      createdBy: User
    timestamps: true
    scoped: true
    policies:
      list: authenticated
      read: authenticated
      create: authenticated
      update: admin
      delete: admin

  Usage:
    fields:
      metric: string required
      value: int required default:1
      org: Organization
      date: string
    timestamps: true
    scoped: true
    policies:
      list: authenticated
      read: authenticated
      create: authenticated
      update: admin
      delete: admin

  Invitation:
    fields:
      email: string required
      role: string enum:owner,admin,member,viewer default:member
      token: string unique
      expiresAt: string
      org: Organization
      invitedBy: User
      status: string enum:pending,accepted,expired default:pending
    timestamps: true
    scoped: true
    policies:
      list: authenticated
      read: authenticated
      create: authenticated
      update: admin
      delete: admin

  AuditLog:
    fields:
      action: string required
      entityType: string
      entityId: string
      changes: text
      ipAddress: string
      userAgent: text
      org: Organization
      user: User
    timestamps: true
    scoped: true
    policies:
      list: authenticated
      read: authenticated
      create: authenticated
      update: admin
      delete: admin

  Webhook:
    fields:
      url: string required
      secret: string
      events: text
      active: bool default:true
      lastTriggeredAt: string
      org: Organization
    timestamps: true
    scoped: true
    policies:
      list: authenticated
      read: authenticated
      create: authenticated
      update: admin
      delete: admin
`,
    actions: {
      billing: `export const checkout_session = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const user = ctx.get("user")
  const { plan, successUrl, cancelUrl } = await ctx.req.json()
  const org = await db.prepare("SELECT * FROM organizations WHERE id = (SELECT orgId FROM org_members WHERE userId = ? AND role = 'owner' LIMIT 1)").get(user.id)
  if (!org) return F.json({ error: "No organization found" }, 404)
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
  const session = await stripe.checkout.sessions.create({
    customer: org.stripeCustomerId || undefined,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan === "pro" ? "price_pro" : "price_enterprise", quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orgId: org.id },
  })
  return F.json({ url: session.url })
})

export const portal = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const user = ctx.get("user")
  const org = await db.prepare("SELECT * FROM organizations WHERE stripeCustomerId IS NOT NULL AND id = (SELECT orgId FROM org_members WHERE userId = ? AND role = 'owner' LIMIT 1)").get(user.id)
  if (!org) return F.json({ error: "No subscription found" }, 404)
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: process.env.APP_URL + "/settings/billing",
  })
  return F.json({ url: session.url })
})

export const usage = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const user = ctx.get("user")
  const org = await db.prepare("SELECT * FROM organizations WHERE id = (SELECT orgId FROM org_members WHERE userId = ? LIMIT 1)").get(user.id)
  if (!org) return F.json({ error: "No organization" }, 404)
  const usage = await db.query(\`
    SELECT metric, SUM(value) as total
    FROM usages
    WHERE orgId = ? AND date >= date('now', '-30 days')
    GROUP BY metric
  \`, [org.id])
  return F.json({ usage })
})`,
      api_keys: `export const rotate = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const { id } = ctx.req.param()
  const user = ctx.get("user")
  const key = await db.prepare("SELECT * FROM api_keys WHERE id = ? AND orgId = (SELECT orgId FROM org_members WHERE userId = ? LIMIT 1)").get(id, user.id)
  if (!key) return F.json({ error: "Not found" }, 404)
  const newKey = "zorux_" + crypto.randomUUID().replace(/-/g, "")
  const prefix = newKey.substring(0, 8)
  await db.prepare("UPDATE api_keys SET key = ?, prefix = ? WHERE id = ?").run(newKey, prefix, id)
  return F.json({ key: newKey, prefix })
})

export const validate_key = F.public(async (ctx) => {
  const db = ctx.get("db")
  const key = ctx.req.header("X-API-Key") || ctx.req.header("Authorization")?.replace("Bearer ", "")
  if (!key) return F.json({ valid: false }, 401)
  const apiKey = await db.prepare("SELECT * FROM api_keys WHERE key = ? AND (expiresAt IS NULL OR expiresAt > datetime('now'))").get(key)
  if (!apiKey) return F.json({ valid: false }, 401)
  await db.prepare("UPDATE api_keys SET lastUsedAt = datetime('now') WHERE id = ?").run(apiKey.id)
  return F.json({ valid: true, orgId: apiKey.orgId })
})`,
      webhooks: `export const test = F.auth(async (ctx) => {
  const db = ctx.get("db")
  const { id } = ctx.req.param()
  const user = ctx.get("user")
  const webhook = await db.prepare("SELECT * FROM webhooks WHERE id = ? AND orgId = (SELECT orgId FROM org_members WHERE userId = ? LIMIT 1)").get(id, user.id)
  if (!webhook) return F.json({ error: "Not found" }, 404)
  const payload = { event: "test", timestamp: new Date().toISOString(), webhookId: webhook.id }
  const signature = crypto.createHmac("sha256", webhook.secret).update(JSON.stringify(payload)).digest("hex")
  const response = await fetch(webhook.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Signature": "sha256=" + signature },
    body: JSON.stringify(payload),
  })
  await db.prepare("UPDATE webhooks SET lastTriggeredAt = datetime('now') WHERE id = ?").run(id)
  return F.json({ status: response.status, ok: response.ok })
})`,
    },
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

  // Write custom actions
  if (scaffold.actions) {
    for (const [module, code] of Object.entries(scaffold.actions)) {
      writeFileSync(join(projectDir, "actions", module + ".ts"), code)
    }
  }

  // Package.json
  writeFileSync(join(projectDir, "package.json"), JSON.stringify({
    name,
    type: "module",
    scripts: { dev: "zorux dev", build: "zorux build", test: "bun test tests/integration" },
    dependencies: { zorux: "^0.2.4", hono: "^4.5.0", zod: "^3.23.0" },
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

  // Count models
  const modelMatches = yamlContent.match(/^\s+\w+:\n\s+fields:/gm) || []
  const modelCount = modelMatches.length
  const actionModules = scaffold.actions ? Object.keys(scaffold.actions).length : 0

  console.log("  \u2705 Created project: " + name)
  console.log("  \u2705 Models: " + modelCount)
  console.log("  \u2705 Custom actions: " + actionModules + " modules")

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
