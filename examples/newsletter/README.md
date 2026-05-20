# Newsletter Example

Minimal newsletter subscription app with double opt-in.

## Quick Start

```bash
zorux new newsletter --preset web
cd newsletter
zorux recipe add newsletter
zorux dev
```

## app.yaml

```yaml
name: newsletter
type: fullstack
database:
  provider: sqlite
auth:
  model: User
  registration: open
email:
  provider: sandbox
models:
  Subscriber:
    fields:
      email: email unique required
      name: string
      status: string enum:active,unsubscribed,bounced default:active
    policies:
      list: admin
      create: "*"
```

## Commands

```bash
zorux dev                    # Start server
zorux recipe add newsletter  # Add campaign + template models
zorux test                   # Run tests
```

## Routes

| Route | Description |
|---|---|
| `POST /api/subscribers` | Public — subscribe |
| `GET /api/subscribers` | Admin — list subscribers |
| `GET /admin` | Admin panel |
