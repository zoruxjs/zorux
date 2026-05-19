export type PolicyType = "public" | "auth" | "role" | "owner"

export interface ParsedPolicy {
  type: PolicyType
  role?: string
  ownerField?: string
}

export function parsePolicy(policyStr: string): ParsedPolicy {
  if (policyStr === "public") return { type: "public" }
  if (policyStr === "auth" || policyStr === "authenticated") return { type: "auth" }

  const roleMatch = policyStr.match(/^role\((.+)\)$/)
  if (roleMatch) return { type: "role", role: roleMatch[1] }

  const ownerMatch = policyStr.match(/^owner\((.+)\)$/)
  if (ownerMatch) return { type: "owner", ownerField: ownerMatch[1] }

  return { type: policyStr as PolicyType }
}

export function createPolicyMiddleware(policy: ParsedPolicy) {
  return async function policyMiddleware(c: any, next: any) {
    if (policy.type === "public") {
      await next()
      return
    }

    const auth = c.req.header("Authorization")
    if (!auth?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const token = auth.slice(7)
    const payload = c.get("user") || null

    if (!payload) {
      // Try to verify JWT (import from auth module)
      try {
        const { default: mod } = await import("../auth")
        // We need a way to verify JWT tokens
      } catch {}
      return c.json({ error: "Invalid token" }, 401)
    }

    if (policy.type === "role" && payload.role !== policy.role) {
      return c.json({ error: "Forbidden: insufficient role" }, 403)
    }

    if (policy.type === "owner") {
      const resourceId = c.req.param("id")
      // The owner check happens in the route handler itself
      // This middleware just marks that ownership check is needed
    }

    await next()
  }
}
