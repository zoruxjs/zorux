import type { AppConfig, CompiledModel } from "../types"
import type { GeneratedSchema } from "../schema"
import { createJWT, verifyJWT } from "../../auth"
import { sendEmail } from "../email"
import { randomBytes } from "crypto"

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

interface OrgRow {
  id: number
  name: string
  slug: string
  owner_id: number
  created_at: string
}

interface OrgMemberRow {
  id: number
  org_id: number
  user_id: number
  role: string
  invited_email?: string
  status: string
  created_at: string
}

// ═══════════════════════════════════════════════════
// Database setup
// ═══════════════════════════════════════════════════

function ensureTables(adapter: any) {
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _organizations (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "name TEXT NOT NULL, " +
    "slug TEXT NOT NULL UNIQUE, " +
    "owner_id INTEGER NOT NULL, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _org_members (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "org_id INTEGER NOT NULL, " +
    "user_id INTEGER, " +
    "role TEXT NOT NULL DEFAULT 'member', " +
    "invited_email TEXT, " +
    "status TEXT NOT NULL DEFAULT 'active', " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP, " +
    "UNIQUE(org_id, user_id), " +
    "UNIQUE(org_id, invited_email)" +
    ")"
  )
  adapter.run(
    "CREATE TABLE IF NOT EXISTS _org_invites (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "org_id INTEGER NOT NULL, " +
    "email TEXT NOT NULL, " +
    "role TEXT NOT NULL DEFAULT 'member', " +
    "token TEXT NOT NULL UNIQUE, " +
    "expires_at TEXT NOT NULL, " +
    "used INTEGER DEFAULT 0, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
    ")"
  )
}

// ═══════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════

function getUserId(c: any): number | null {
  const user = c.get("user")
  return user?.id || null
}

async function authenticate(c: any): Promise<number | null> {
  const auth = c.req.header("Authorization")
  let token: string | null = null
  if (auth?.startsWith("Bearer ")) token = auth.slice(7)
  else {
    const cookie = c.req.header("Cookie") || ""
    const match = cookie.match(/token=([^;]+)/)
    token = match ? match[1] : null
  }
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.id || null
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36)
}

function generateInviteToken(): string {
  return randomBytes(24).toString("hex")
}

function memberHasRole(member: any, requiredRoles: string[]): boolean {
  return requiredRoles.includes(member?.role)
}

async function requireOrgAccess(adapter: any, orgId: number, userId: number, requiredRoles?: string[]): Promise<OrgMemberRow | null> {
  if (!userId) return null
  const member = adapter.get("SELECT * FROM _org_members WHERE org_id = ? AND user_id = ? AND status = 'active'", [orgId, userId])
  if (!member) return null
  if (requiredRoles && !memberHasRole(member, requiredRoles)) return null
  return member
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerOrgRoutes(app: any, config: AppConfig, schema: GeneratedSchema, _models: CompiledModel[]) {
  const adapter = schema.adapter
  const orgCfg = (config as any).auth?.organization
  if (!orgCfg?.enabled) return

  ensureTables(adapter)
  const baseUrl = process.env.BASE_URL || "http://localhost:3000"

  // ── Create Organization ──
  app.post("/api/auth/orgs", async (c: any) => {
    try {
      const userId = await authenticate(c)
      if (!userId) return c.json({ error: "Unauthorized" }, 401)

      const { name } = await c.req.json()
      if (!name) return c.json({ error: "Name is required" }, 400)

      const slug = generateSlug(name)
      adapter.run("INSERT INTO _organizations (name, slug, owner_id) VALUES (?, ?, ?)", [name, slug, userId])
      const org = adapter.get("SELECT * FROM _organizations WHERE slug = ?", [slug])

      // Add creator as owner
      adapter.run("INSERT INTO _org_members (org_id, user_id, role, status) VALUES (?, ?, 'owner', 'active')", [org.id, userId])

      return c.json(org, 201)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── List Organizations ──
  app.get("/api/auth/orgs", async (c: any) => {
    try {
      const userId = await authenticate(c)
      if (!userId) return c.json({ error: "Unauthorized" }, 401)

      const orgs = adapter.all(
        "SELECT o.*, om.role FROM _organizations o JOIN _org_members om ON o.id = om.org_id WHERE om.user_id = ? AND om.status = 'active' ORDER BY o.created_at DESC",
        [userId]
      )
      return c.json({ organizations: orgs })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Get Organization ──
  app.get("/api/auth/orgs/:id", async (c: any) => {
    try {
      const userId = await authenticate(c)
      if (!userId) return c.json({ error: "Unauthorized" }, 401)

      const orgId = parseInt(c.req.param("id"))
      const member = await requireOrgAccess(adapter, orgId, userId)
      if (!member) return c.json({ error: "Forbidden" }, 403)

      const org = adapter.get("SELECT * FROM _organizations WHERE id = ?", [orgId])
      const members = adapter.all(
        "SELECT om.id, om.user_id, om.role, om.status, u.name, u.email FROM _org_members om LEFT JOIN users u ON om.user_id = u.id WHERE om.org_id = ?",
        [orgId]
      )

      return c.json({ ...org, members })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Update Organization ──
  app.put("/api/auth/orgs/:id", async (c: any) => {
    try {
      const userId = await authenticate(c)
      if (!userId) return c.json({ error: "Unauthorized" }, 401)

      const orgId = parseInt(c.req.param("id"))
      const member = await requireOrgAccess(adapter, orgId, userId, ["owner", "admin"])
      if (!member) return c.json({ error: "Forbidden" }, 403)

      const { name } = await c.req.json()
      adapter.run("UPDATE _organizations SET name = ? WHERE id = ?", [name, orgId])
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Delete Organization ──
  app.delete("/api/auth/orgs/:id", async (c: any) => {
    try {
      const userId = await authenticate(c)
      if (!userId) return c.json({ error: "Unauthorized" }, 401)

      const orgId = parseInt(c.req.param("id"))
      const member = await requireOrgAccess(adapter, orgId, userId, ["owner"])
      if (!member) return c.json({ error: "Forbidden" }, 403)

      adapter.run("DELETE FROM _org_members WHERE org_id = ?", [orgId])
      adapter.run("DELETE FROM _organizations WHERE id = ?", [orgId])
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── List Members ──
  app.get("/api/auth/orgs/:id/members", async (c: any) => {
    try {
      const userId = await authenticate(c)
      if (!userId) return c.json({ error: "Unauthorized" }, 401)

      const orgId = parseInt(c.req.param("id"))
      const member = await requireOrgAccess(adapter, orgId, userId)
      if (!member) return c.json({ error: "Forbidden" }, 403)

      const members = adapter.all(
        "SELECT om.id, om.user_id, om.role, om.status, u.name, u.email FROM _org_members om LEFT JOIN users u ON om.user_id = u.id WHERE om.org_id = ? ORDER BY om.created_at ASC",
        [orgId]
      )
      return c.json({ members })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Invite Member ──
  app.post("/api/auth/orgs/:id/invite", async (c: any) => {
    try {
      const userId = await authenticate(c)
      if (!userId) return c.json({ error: "Unauthorized" }, 401)

      const orgId = parseInt(c.req.param("id"))
      const member = await requireOrgAccess(adapter, orgId, userId, ["owner", "admin"])
      if (!member) return c.json({ error: "Forbidden" }, 403)

      const { email, role } = await c.req.json()
      if (!email) return c.json({ error: "Email is required" }, 400)

      // Check if already member
      const existing = adapter.get("SELECT * FROM _org_members WHERE org_id = ? AND (user_id IN (SELECT id FROM users WHERE email = ?) OR invited_email = ?)", [orgId, email, email])
      if (existing) return c.json({ error: "User already invited or member" }, 409)

      const inviteRole = role || "member"
      const token = generateInviteToken()
      const expiresAt = new Date(Date.now() + (orgCfg.inviteExpiresIn || 7) * 86400_000).toISOString()

      adapter.run(
        "INSERT INTO _org_invites (org_id, email, role, token, expires_at) VALUES (?, ?, ?, ?, ?)",
        [orgId, email, inviteRole, token, expiresAt]
      )

      // Also create pending member entry
      const user = adapter.get("SELECT id FROM users WHERE email = ?", [email])
      adapter.run(
        "INSERT OR IGNORE INTO _org_members (org_id, user_id, role, invited_email, status) VALUES (?, ?, ?, ?, 'pending')",
        [orgId, user?.id || null, inviteRole, email]
      )

      // Send invite email
      const acceptLink = `${baseUrl}/api/auth/orgs/accept-invite?token=${token}`
      const org = adapter.get("SELECT name FROM _organizations WHERE id = ?", [orgId])
      await sendEmail({
        to: email,
        subject: `You're invited to ${org.name}`,
        html: `<p>Click <a href="${acceptLink}">here</a> to join <strong>${org.name}</strong>.</p>`,
        text: `Join ${org.name}: ${acceptLink}`,
      })

      return c.json({ message: "Invite sent", token }, 201)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Accept Invite ──
  app.get("/api/auth/orgs/accept-invite", async (c: any) => {
    try {
      const token = c.req.query("token")
      if (!token) return c.json({ error: "Missing token" }, 400)

      const invite = adapter.get(
        "SELECT * FROM _org_invites WHERE token = ? AND used = 0 AND expires_at > ?",
        [token, new Date().toISOString()]
      )
      if (!invite) return c.json({ error: "Invalid or expired invite" }, 400)

      const userId = await authenticate(c)
      if (!userId) {
        // Redirect to login with invite token in query
        return c.redirect(`/login?invite=${token}`, 302)
      }

      // Accept: update member status
      adapter.run("UPDATE _org_members SET status = 'active', user_id = ? WHERE org_id = ? AND invited_email = (SELECT email FROM users WHERE id = ?)", [userId, invite.org_id, userId])
      adapter.run("UPDATE _org_invites SET used = 1 WHERE id = ?", [invite.id])

      return c.redirect("/admin", 302)
    } catch (err: any) {
      return c.json({ error: err.message }, 400)
    }
  })

  // ── Decline Invite ──
  app.post("/api/auth/orgs/decline-invite", async (c: any) => {
    try {
      const { token } = await c.req.json()
      if (!token) return c.json({ error: "Missing token" }, 400)

      const invite = adapter.get("SELECT * FROM _org_invites WHERE token = ? AND used = 0", [token])
      if (!invite) return c.json({ error: "Invalid invite" }, 400)

      adapter.run("DELETE FROM _org_members WHERE org_id = ? AND invited_email = ?", [invite.org_id, invite.email])
      adapter.run("UPDATE _org_invites SET used = 1 WHERE id = ?", [invite.id])

      return c.json({ message: "Invite declined" })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Update Member Role ──
  app.post("/api/auth/orgs/:id/members/:memberId", async (c: any) => {
    try {
      const userId = await authenticate(c)
      if (!userId) return c.json({ error: "Unauthorized" }, 401)

      const orgId = parseInt(c.req.param("id"))
      const admin = await requireOrgAccess(adapter, orgId, userId, ["owner", "admin"])
      if (!admin) return c.json({ error: "Forbidden" }, 403)

      const memberId = parseInt(c.req.param("memberId"))
      const { role } = await c.req.json()
      if (!role) return c.json({ error: "Role is required" }, 400)

      const targetMember = adapter.get("SELECT * FROM _org_members WHERE id = ? AND org_id = ?", [memberId, orgId])
      if (!targetMember) return c.json({ error: "Member not found" }, 404)
      if (targetMember.role === "owner" && admin.role !== "owner") return c.json({ error: "Only owner can change owner's role" }, 403)

      adapter.run("UPDATE _org_members SET role = ? WHERE id = ?", [role, memberId])
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // ── Remove Member ──
  app.delete("/api/auth/orgs/:id/members/:memberId", async (c: any) => {
    try {
      const userId = await authenticate(c)
      if (!userId) return c.json({ error: "Unauthorized" }, 401)

      const orgId = parseInt(c.req.param("id"))
      const admin = await requireOrgAccess(adapter, orgId, userId, ["owner", "admin"])
      if (!admin) return c.json({ error: "Forbidden" }, 403)

      const memberId = parseInt(c.req.param("memberId"))
      const targetMember = adapter.get("SELECT * FROM _org_members WHERE id = ? AND org_id = ?", [memberId, orgId])
      if (!targetMember) return c.json({ error: "Member not found" }, 404)
      if (targetMember.role === "owner" && admin.role !== "owner") return c.json({ error: "Only owner can remove owner" }, 403)
      if (targetMember.user_id === userId) return c.json({ error: "You cannot remove yourself" }, 400)

      adapter.run("DELETE FROM _org_members WHERE id = ?", [memberId])
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })
}

// ═══════════════════════════════════════════════════
// Org Context Middleware
// ═══════════════════════════════════════════════════

export function orgMiddleware(_adapter: any) {
  return async (c: any, next: any) => {
    const orgHeader = c.req.header("X-Org-ID")
    const orgQuery = c.req.query?.("orgId")
    const orgId = orgHeader || orgQuery || ""
    if (orgId) {
      const parsed = parseInt(orgId)
      if (!isNaN(parsed)) {
        c.set("org", { id: parsed, role: "" })
      }
    }
    await next()
  }
}

export function getOrg(c: any): { id: number; role: string } | null {
  return c.get("org") || null
}
