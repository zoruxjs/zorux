// ── Error hint patterns ──

interface Hint {
  pattern: RegExp
  hints: string[]
  docs?: string
}

const hints: Hint[] = [
  // Database
  {
    pattern: /no column named/i,
    hints: [
      "A field in your data doesn't exist in the database table.",
      "If you added a new field to app.yaml, run 'fw db migrate' to apply schema changes.",
      "If this is a new model, the table will be created on next 'fw dev' restart.",
    ],
    docs: "/docs/database",
  },
  {
    pattern: /UNIQUE constraint failed/i,
    hints: [
      "A record with this value already exists.",
      "Make the field non-unique in app.yaml, or handle duplicates in your code.",
      "Use PUT instead of POST for upsert behavior.",
    ],
  },
  {
    pattern: /FOREIGN KEY constraint failed/i,
    hints: [
      "The related record doesn't exist yet.",
      "Create the parent record first, or check the relation ID value.",
      "Ensure both models are defined in app.yaml.",
    ],
  },
  {
    pattern: /ECONNREFUSED|ECONNRESET|ETIMEDOUT/i,
    hints: [
      "Database connection refused. Is your database running?",
      "Check the 'url' in the 'database' section of app.yaml.",
      "For PostgreSQL/MySQL: verify host, port, credentials.",
    ],
    docs: "/docs/database",
  },

  // Models & YAML
  {
    pattern: /cannot find/i,
    hints: [
      "A file or module is missing. Check the path and filename.",
      "If this is an npm package, run 'bun install <package-name>'.",
      "If this is a local file, ensure the path is correct.",
    ],
  },
  {
    pattern: /model.*not found|model.*undefined/i,
    hints: [
      "Check the model name in your app.yaml. Model names are case-sensitive.",
      "Ensure the model is defined in the 'models' section of app.yaml.",
      "If referencing another model (e.g. 'author: user'), verify the model name matches exactly.",
    ],
  },
  {
    pattern: /field.*not found|field.*undefined/i,
    hints: [
      "Check the field name in your app.yaml definition.",
      "Fields are case-sensitive. Verify spelling and indentation.",
    ],
  },

  // Policy engine
  {
    pattern: /Unexpected token/i,
    hints: [
      "Syntax error in a policy expression in app.yaml.",
      "Check the policies section for your model.",
      "Valid operators: ==, !=, >, <, >=, <=, in, matches, exists, &&, ||, !",
      "Example: 'user.role == \"admin\"' or 'resource.authorId == user.id'",
    ],
    docs: "/docs/auth#policies",
  },
  {
    pattern: /permissions|forbidden/i,
    hints: [
      "The current user doesn't have permission for this action.",
      "Check the policies in app.yaml for this model.",
      "Verify the user has the required role (admin, editor, etc.).",
    ],
  },

  // Auth
  {
    pattern: /Invalid credentials/i,
    hints: [
      "Email or password is incorrect.",
      "Try resetting your password.",
      "Check that the account exists and is verified.",
    ],
  },
  {
    pattern: /JWT|jwt|token.*invalid|token.*expired/i,
    hints: [
      "Your session token is invalid or expired.",
      "Try logging in again to get a fresh token.",
      "If using API keys, ensure the key is correct and active.",
    ],
  },

  // Import / module
  {
    pattern: /Cannot find module|module not found/i,
    hints: [
      "A required npm package is not installed.",
      "Run 'bun install' to install dependencies.",
      "If it's an optional feature, check the documentation for setup instructions.",
    ],
  },

  // Validation
  {
    pattern: /Validation failed/i,
    hints: [
      "The request data doesn't match the model schema.",
      "Check the 'required' fields defined in app.yaml.",
      "Verify field types: strings for text, numbers for int/float.",
    ],
  },

  // Soft delete
  {
    pattern: /deleted_at/i,
    hints: [
      "This record was soft-deleted.",
      "Use the restore endpoint to recover it: POST /api/<model>/<id>/restore",
      "Or use permanent delete: DELETE /api/<model>/<id>/permanent",
    ],
  },

  // Scoped/multi-tenant
  {
    pattern: /X-Org-ID header required/i,
    hints: [
      "This model is multi-tenant scoped. Include X-Org-ID header with the organization ID.",
      "If you didn't intend to use multi-tenancy, remove 'scoped: true' from the model in app.yaml.",
    ],
  },

  // Rate limiter
  {
    pattern: /Rate limit exceeded/i,
    hints: [
      "Too many requests. Wait a minute before trying again.",
      "The rate limit is 200 requests per minute by default.",
      "You can configure this in the security settings.",
    ],
  },

  // General / unknown
  {
    pattern: /.*/,
    hints: [
      "Check the app.yaml configuration for syntax errors.",
      "Run 'fw audit' for a security and configuration check.",
      "Run 'fw doctor' to validate your project setup.",
    ],
  },
]

export function getHints(errorMessage: string, statusCode?: number): { hints: string[]; docs?: string } {
  for (const h of hints) {
    if (h.pattern.test(errorMessage)) {
      return { hints: h.hints, docs: h.docs }
    }
  }
  return { hints: ["An unexpected error occurred. Check the logs for details."] }
}

export function formatErrorWithHints(errorMessage: string, statusCode?: number): string {
  const { hints: hintList, docs } = getHints(errorMessage, statusCode)
  let output = `\n  ✖ ${errorMessage}\n`
  output += `  ──────────────────────────────\n`
  for (const hint of hintList) {
    output += `  💡 ${hint}\n`
  }
  if (docs) {
    output += `  📖 See: ${docs}\n`
  }
  return output
}

export function formatCLIError(err: Error): string {
  return formatErrorWithHints(err.message)
}
