# API CRUD

Every model automatically gets a full REST API.

## Endpoints

```
GET    /api/{model}                  # List with search/sort/pagination
GET    /api/{model}/:id              # Get by ID
POST   /api/{model}                  # Create
PUT    /api/{model}/:id              # Update
DELETE /api/{model}/:id              # Delete
```

## Query Parameters

### Search, Sort, Pagination

```
GET /api/posts?search=hello&sort=title&order=desc&page=1&limit=20
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Search across all string/text fields |
| `sort` | string | `id` | Field to sort by |
| `order` | `asc`/`desc` | `asc` | Sort direction |
| `page` | int | `1` | Page number |
| `limit` | int | `20` | Items per page (max 100) |

### Include Relations

```
GET /api/posts/1?include=author
GET /api/posts?include=author,category
```

### Response Format

```json
{
  "data": [
    { "id": 1, "title": "Post 1", "authorId": 1, "author": { "id": 1, "name": "Alice" } }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

## Validation

Validation rules from YAML are enforced automatically:

```yaml
models:
  Post:
    fields:
      title: string required min:3 max:100
      rating: int min:1 max:5
      status: string enum:draft,published
```

Invalid requests return `400 { error: "Validation failed", errors: [...] }`.

## File Upload

Models with `file` type fields accept `multipart/form-data`:

```yaml
models:
  Post:
    fields:
      image: file
```

```bash
curl -F "title=My Post" -F "image=@photo.jpg" http://localhost:3000/api/posts
```

## OpenAPI / Swagger

```
GET /api/openapi.json       # OpenAPI 3.0 spec
GET /api/docs               # Swagger UI
```

## Custom Actions

```ts
// actions/posts.ts
export const publish = {
  policy: "admin",
  handler: async (c) => {
    const { id } = c.req.param()
    // Custom logic here
    return c.json({ success: true })
  },
}
```

Route: `POST /api/actions/posts/publish`
