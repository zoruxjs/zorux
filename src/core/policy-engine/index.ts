// ═══════════════════════════════════════════════════
// AST Nodes
// ═══════════════════════════════════════════════════

type Expr =
  | { type: "literal"; value: any }
  | { type: "ident"; path: string[] }
  | { type: "unary"; op: "!"; expr: Expr }
  | { type: "binary"; op: string; left: Expr; right: Expr }
  | { type: "in"; expr: Expr; list: Expr[] }
  | { type: "call"; name: string; args: Expr[] }

// ═══════════════════════════════════════════════════
// Lexer
// ═══════════════════════════════════════════════════

function tokenize(input: string): string[] {
  const tokens: string[] = []
  const re = /\s*(==|!=|>=|<=|&&|\|\||[()!\[\],]|[a-zA-Z_][a-zA-Z0-9_.]*|'[^']*'|"[^"]*"|\d+\.?\d*|[><:])\s*/g
  let match: RegExpExecArray | null
  while ((match = re.exec(input)) !== null) {
    tokens.push(match[1])
  }
  return tokens
}

// ═══════════════════════════════════════════════════
// Parser (recursive descent)
// ═══════════════════════════════════════════════════

class Parser {
  private pos = 0
  constructor(private tokens: string[]) {}

  peek(): string { return this.tokens[this.pos] || "" }
  consume(): string { return this.tokens[this.pos++] || "" }

  parse(): Expr {
    const expr = this.parseOr()
    if (this.peek()) throw new Error("Unexpected token: " + this.peek())
    return expr
  }

  parseOr(): Expr {
    let left = this.parseAnd()
    while (this.peek() === "||") {
      this.consume()
      left = { type: "binary", op: "||", left, right: this.parseAnd() }
    }
    return left
  }

  parseAnd(): Expr {
    let left = this.parseComparison()
    while (this.peek() === "&&") {
      this.consume()
      left = { type: "binary", op: "&&", left, right: this.parseComparison() }
    }
    return left
  }

  parseComparison(): Expr {
    const left = this.parsePrimary()
    const op = this.peek()
    if (["==", "!=", ">", ">=", "<", "<="].includes(op)) {
      this.consume()
      return { type: "binary", op, left, right: this.parsePrimary() }
    }
    if (op === "in") {
      this.consume()
      this.consume() // consume '['
      const items: Expr[] = []
      while (this.peek() !== "]") {
        items.push(this.parsePrimary())
        if (this.peek() === ",") this.consume()
      }
      this.consume() // consume ']'
      return { type: "in", expr: left, list: items }
    }
    if (op === "matches") {
      this.consume()
      return { type: "binary", op: "matches", left, right: this.parsePrimary() }
    }
    if (op === "contains") {
      this.consume()
      return { type: "binary", op: "contains", left, right: this.parsePrimary() }
    }
    return left
  }

  parsePrimary(): Expr {
    const t = this.peek()
    if (t === "(") {
      this.consume()
      const expr = this.parseOr()
      this.consume() // ')'
      return expr
    }
    if (t === "!") {
      this.consume()
      return { type: "unary", op: "!", expr: this.parsePrimary() }
    }
    if (t === "true" || t === "false") {
      this.consume()
      return { type: "literal", value: t === "true" }
    }
    if (t === "exists") {
      this.consume()
      return { type: "call", name: "exists", args: [this.parsePrimary()] }
    }
    if (/^\d/.test(t)) {
      this.consume()
      return { type: "literal", value: t.includes(".") ? parseFloat(t) : parseInt(t) }
    }
    if (t.startsWith("'") || t.startsWith('"')) {
      this.consume()
      return { type: "literal", value: t.slice(1, -1) }
    }
    if (/^[a-zA-Z_]/.test(t)) {
      this.consume()
      return { type: "ident", path: t.split(".") }
    }
    throw new Error("Unexpected token: " + t)
  }
}

// AST cache: avoid re-parsing the same policy string on every request
const astCache = new Map<string, Expr>()

function parse(input: string): Expr {
  const cached = astCache.get(input)
  if (cached) return cached
  const ast = new Parser(tokenize(input)).parse()
  if (input.length < 500) astCache.set(input, ast) // don't cache very large policies
  return ast
}

export function clearASTCache(): void {
  astCache.clear()
}

// ═══════════════════════════════════════════════════
// Evaluator
// ═══════════════════════════════════════════════════

interface PolicyContext {
  user: Record<string, any>
  resource: Record<string, any>
  env: Record<string, any>
}

function resolveIdent(path: string[], ctx: PolicyContext): any {
  const [scope, ...rest] = path
  if (scope === "user" || scope === "resource" || scope === "env") {
    const root = (ctx as any)[scope]
    return rest.reduce((acc, key) => acc?.[key], root)
  }
  // Unqualified identifier: resolve from resource only
  if (ctx.resource && scope in ctx.resource) {
    return ctx.resource[scope]
  }
  return undefined
}

function evaluate(expr: Expr, ctx: PolicyContext): any {
  switch (expr.type) {
    case "literal":
      return expr.value

    case "ident": {
      const val = resolveIdent(expr.path, ctx)
      return val !== undefined ? val : null
    }

    case "unary": {
      if (expr.op === "!") return !evaluate(expr.expr, ctx)
      throw new Error("Unknown unary op: " + expr.op)
    }

    case "binary": {
      const left = evaluate(expr.left, ctx)
      const right = evaluate(expr.right, ctx)

      switch (expr.op) {
        case "==": return left === right
        case "!=": return left !== right
        case ">": return left > right
        case ">=": return left >= right
        case "<": return left < right
        case "<=": return left <= right
        case "&&": return left && right
        case "||": return left || right
        case "matches": return new RegExp(right).test(String(left))
        case "contains": return Array.isArray(left) ? left.includes(right) : String(left).includes(String(right))
        default: throw new Error("Unknown op: " + expr.op)
      }
    }

    case "in": {
      const val = evaluate(expr.expr, ctx)
      return expr.list.some(item => evaluate(item, ctx) === val)
    }

    case "call": {
      if (expr.name === "exists") {
        const val = evaluate(expr.args[0], ctx)
        return val !== null && val !== undefined
      }
      throw new Error("Unknown function: " + expr.name)
    }
  }
}

// ═══════════════════════════════════════════════════
// Audit trail
// ═══════════════════════════════════════════════════

interface AuditEntry {
  timestamp: string
  policy: string
  operation: string
  model: string
  userId: any
  allowed: boolean
  reason: string
  context: { user: any; resource: any }
}

const auditLog: AuditEntry[] = []

function logDecision(entry: Omit<AuditEntry, "timestamp">): void {
  auditLog.push({ ...entry, timestamp: new Date().toISOString() })
  // Keep last 1000 entries
  if (auditLog.length > 1000) auditLog.shift()
}

export function getAuditLog(): AuditEntry[] {
  return [...auditLog]
}

export function clearAuditLog(): void {
  auditLog.length = 0
}

// ═══════════════════════════════════════════════════
// Derived roles
// ═══════════════════════════════════════════════════

interface DerivedRole {
  name: string
  condition: string
}

const derivedRoles: DerivedRole[] = []

export function addDerivedRole(role: DerivedRole): void {
  derivedRoles.push(role)
}

export function computeDerivedRoles(user: Record<string, any>): string[] {
  const roles: string[] = []
  for (const dr of derivedRoles) {
    try {
      const ctx: PolicyContext = { user, resource: {}, env: {} }
      const result = evaluate(parse(dr.condition), ctx)
      if (result === true) roles.push(dr.name)
    } catch {}
  }
  return roles
}

// ═══════════════════════════════════════════════════
// Main evaluation function
// ═══════════════════════════════════════════════════

export interface EvalResult {
  allowed: boolean
  reason: string
  matched?: string
}

export function evaluatePolicy(
  condition: string,
  ctx: PolicyContext,
): EvalResult {
  try {
    // Handle simple policy strings (backward compatibility)
    const trimmed = condition.trim()
    if (trimmed === "*") return { allowed: true, reason: "public" }
    if (trimmed === "authenticated") {
      return ctx.user?.id
        ? { allowed: true, reason: "authenticated" }
        : { allowed: false, reason: "authentication required" }
    }

    // Role-based (simple)
    if (/^[a-zA-Z_,]+$/.test(trimmed)) {
      const roles = trimmed.split(",").map(r => r.trim())
      const userRoles = ctx.user?.role ? [ctx.user.role].concat(computeDerivedRoles(ctx.user)) : []
      const hasRole = roles.some(r => userRoles.includes(r))
      return hasRole
        ? { allowed: true, reason: "role matched: " + trimmed }
        : { allowed: false, reason: "required role: " + trimmed }
    }

    // ABAC condition
    const ast = parse(condition)
    const result = evaluate(ast, ctx)

    if (result === true) return { allowed: true, reason: "condition met" }
    return { allowed: false, reason: "condition not met" }
  } catch (err: any) {
    return { allowed: false, reason: "policy error: " + err.message }
  }
}

// ═══════════════════════════════════════════════════
// Field-level security
// ═══════════════════════════════════════════════════

export interface FieldPolicy {
  field: string
  readable?: string
  writable?: string
}

export function checkFieldAccess(
  fieldPolicies: FieldPolicy[],
  field: string,
  operation: "read" | "write",
  ctx: PolicyContext,
): boolean {
  const fp = fieldPolicies.find(f => f.field === field)
  if (!fp) return true // No policy = allowed

  const condition = operation === "read" ? fp.readable : fp.writable
  if (!condition) return operation === "read" // Write needs explicit policy

  return evaluatePolicy(condition, ctx).allowed
}

export function filterFields<T extends Record<string, any>>(
  fieldPolicies: FieldPolicy[],
  data: T | T[],
  operation: "read" | "write",
  ctx: PolicyContext,
): T | T[] {
  const filter = (item: T): T => {
    const result = { ...item }
    for (const key of Object.keys(item)) {
      if (!checkFieldAccess(fieldPolicies, key, operation, ctx)) {
        delete (result as any)[key]
      }
    }
    return result
  }

  return Array.isArray(data) ? data.map(filter) : filter(data)
}

// ═══════════════════════════════════════════════════
// High-level policy check with audit
// ═══════════════════════════════════════════════════

export interface PolicyCheckInput {
  policy: string
  model: string
  operation: string
  user: Record<string, any>
  resource?: Record<string, any>
  fieldPolicies?: FieldPolicy[]
}

export function checkPolicy(input: PolicyCheckInput): EvalResult {
  const ctx: PolicyContext = {
    user: input.user || {},
    resource: input.resource || {},
    env: { now: Date.now() },
  }

  const result = evaluatePolicy(input.policy, ctx)

  logDecision({
    policy: input.policy,
    operation: input.operation,
    model: input.model,
    userId: input.user?.id,
    allowed: result.allowed,
    reason: result.reason,
    context: { user: input.user, resource: input.resource },
  })

  return result
}
