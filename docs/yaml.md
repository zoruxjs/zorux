# YAML Reference

The `app.yaml` file is the single source of truth for your Zorux application.

## Top-level fields

```yaml
name: my-app              # Required: project name
type: api                 # api | web | mobile | fullstack
provider: Zorux             # Zorux | supabase
database:                 # Database configuration
storage:                  # Storage configuration
email:                    # Email configuration
auth:                     # Authentication configuration
models:                   # Required: data models
plugins: [ ]              # Plugin names
realtime:                 # Realtime configuration
theme:                    # Theme configuration
```

## Database

```yaml
database:
  provider: sqlite        # sqlite | postgres | mysql | mongodb
  url: ":memory:"         # Connection string
```

## Auth

```yaml
auth:
  model: User             # Model to use for auth
  registration: open      # open | invite | admin
  roles: [admin, editor, viewer]
  defaultRole: viewer
```

## Models

```yaml
models:
  Post:
    fields:
      title: string required min:3 max:100
      body: text
      rating: int min:1 max:5
      status: string enum:draft,published,archived
      author: User
    timestamps: true
    policies:
      list: "*"
      read: authenticated
      create: admin,editor
      update: owner
      delete: admin
    seed: 20
```

### Field types

| Type | Description |
|------|-------------|
| `string` | Text string |
| `text` | Long text |
| `int` | Integer number |
| `float` | Decimal number |
| `bool` | Boolean |
| `file` | File upload |
| `enum:a,b,c` | Enum values |
| `User` | Belongs-to relation |

### Field modifiers

| Modifier | Description |
|----------|-------------|
| `required` | Field is required |
| `unique` | Field must be unique |
| `min:N` | Minimum length/value |
| `max:N` | Maximum length/value |
| `pattern:...` | Regex pattern |
| `enum:a,b,c` | Allowed values |
| `default:V` | Default value |

## Policies

| Value | Description |
|-------|-------------|
| `"*"` | Public access |
| `"authenticated"` | Any logged-in user |
| `"admin"` | Admin role only |
| `"admin,editor"` | Admin or Editor |
| `"owner"` | Record owner or admin |
