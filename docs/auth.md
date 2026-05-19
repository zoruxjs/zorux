# Auth & RBAC

## Authentication

Zorux provides built-in auth with JWT + bcrypt (password hashing).

```yaml
auth:
  model: User
  registration: open
  roles: [admin, editor, viewer]
  defaultRole: viewer
```

### API Endpoints

```
POST /api/auth/register   { name, email, password, role? }  → { token, user }
POST /api/auth/login      { email, password }                → { token, user }
GET  /api/auth/me         Authorization: Bearer <token>      → { user }
```

### Auth in Supabase

```yaml
provider: supabase
supabase:
  url: https://xyz.supabase.co
  anonKey: ...
  serviceKey: ...
```

Supabase Auth supports Google, GitHub, Discord, email magic link, and more.

## RBAC (Role-Based Access Control)

### Policies per model

```yaml
models:
  Post:
    policies:
      list: "*"               # Public
      read: authenticated     # Any logged in
      create: admin,editor    # Admin or Editor
      update: owner           # Owner or Admin
      delete: admin           # Admin only
```

### How owner is detected

If a model has a `belongsTo` relation to the auth model (e.g., `author: User`), the `authorId` field is automatically used as the owner field.

### Policy values

| Value | Effect |
|-------|--------|
| `"*"` | No auth required |
| `"authenticated"` | Any valid JWT |
| `"admin"` | Role must be `admin` |
| `"admin,editor"` | Role must be `admin` OR `editor` |
| `"owner"` | Record owner (or admin) |
| (not set) | `"authenticated"` if model has auth, else `"*"` |

### Custom actions with policies

```ts
// actions/posts.ts
export const publish = {
  policy: "admin",
  handler: async (c) => {
    // Only admins can access this
    return c.json({ success: true })
  },
}
```

Route: `POST /api/actions/posts/publish`
