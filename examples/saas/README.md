# SaaS Example

Full SaaS app with teams, subscriptions, and admin.

## Quick Start

```bash
zorux new saas --preset saas
cd saas
zorux dev
```

## app.yaml

```yaml
name: saas
type: fullstack
database:
  provider: sqlite
auth:
  model: User
  registration: open
  roles: [admin, member]
  organization:
    enabled: true
    roles: [owner, admin, member]
models:
  User:
    fields:
      name: string required
      email: string unique
    auth: password
  Project:
    fields:
      name: string required
      description: text
      org: Organization
    timestamps: true
    scoped: true
    policies:
      list: authenticated
      create: authenticated
      update: owner
cache:
  provider: memory
email:
  provider: sandbox
```

## Commands

```bash
zorux dev                    # Start server
zorux recipe add billing     # Add Stripe subscriptions
zorux recipe add teams       # Add organization invites
zorux test                   # Run tests
```
