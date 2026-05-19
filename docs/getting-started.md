# Zorux Framework — Getting Started

Zorux is an AI-first full-stack framework. Define your app in a single YAML file (~200 tokens) and get API, Web SSR, Mobile, Realtime, and more.

## Quick Start

```bash
# Create a new project
fw new my-app --fullstack
cd my-app

# Start development server
fw dev

# Open in browser
open http://localhost:3000
```

## Project Structure

```
my-app/
├── app.yaml          # Main config: models, auth, database, plugins
├── actions/          # Custom server actions
│   └── *.ts
├── jobs/             # Background jobs
│   └── *.ts
├── plugins/          # Local plugins
│   └── *.ts
├── public/           # Static files
│   └── uploads/
├── mobile/           # Generated Expo app
├── src/              # Generated production entry point
├── .env              # Environment variables
└── package.json
```

## Defining Models

```yaml
name: my-app
type: api

database:
  provider: sqlite

models:
  User:
    fields:
      name: string required
      email: string unique
    auth: password

  Post:
    fields:
      title: string required min:3 max:100
      body: text
      rating: int min:1 max:5
      status: string enum:draft,published,archived
      author: User
```

## Running

```bash
fw dev              # Development server with hot reload
fw gen mobile       # Generate Expo mobile app
```

## Next Steps

- [YAML Reference](yaml.md)
- [Database](database.md)
- [Auth & RBAC](auth.md)
- [Admin UI](admin.md)
- [API CRUD](api.md)
