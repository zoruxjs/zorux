# Database

Zorux supports multiple database providers through a unified DataCollection interface.

## Providers

```yaml
database:
  provider: sqlite           # sqlite | postgres | mysql | mongodb
  url: ":memory:"            # Connection string or :memory: for SQLite
```

| Provider | Package (optional) | Notes |
|----------|-------------------|-------|
| `sqlite` | Built into Bun | Default, no install needed |
| `postgres` | `npm install postgres` | Full PostgreSQL support |
| `mysql` | `npm install mysql2` | MySQL/MariaDB |
| `mongodb` | `npm install mongodb` | Document database (schemaless) |

## Schema

Tables are created automatically from YAML models:

```yaml
models:
  User:
    fields:
      name: string required
      email: string unique
    auth: password
  Post:
    fields:
      title: string required
      author: User
    timestamps: true
```

Generated SQL:

```sql
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE, password TEXT NOT NULL);
CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, authorId INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (authorId) REFERENCES users(id));
```

## DataCollection API

All database operations go through `DataCollection`, which works identically across SQL and NoSQL:

```ts
const col = database.collection("posts", model)

await col.find(sort, order, limit, offset)                    // List
await col.findById(id)                                         // Get by ID
await col.findBy(field, value)                                 // Find by field
await col.insert(data)                                         // Create
await col.update(id, data)                                     // Update
await col.deleteById(id)                                       // Delete
await col.count()                                              // Count
await col.search(fields, term, sort, order, limit, offset)     // Search
```
