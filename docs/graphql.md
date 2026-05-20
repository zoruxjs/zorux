# GraphQL

<!-- maturity: 🧪 Beta -->
> **🧪 Beta** — This feature is functional but may have breaking changes


Zorux auto-generates a GraphQL schema from your models with queries, mutations, and pagination support.

## Configuration

GraphQL is enabled automatically. The `graphql` npm package is lazy-loaded (only required when you make a GraphQL request).

```bash
npm install graphql
```

## Endpoint

```
POST /api/graphql
GET /api/graphql?query={...}
```

## Auto-Generated Schema

For each model, Zorux generates:

### Type

```graphql
type Post {
  id: Int!
  title: String!
  body: String!
  status: String
  authorId: Int
  createdAt: String
  updatedAt: String
}
```

### Input Type

```graphql
input PostInput {
  title: String!
  body: String!
  status: String
  authorId: Int
}
```

### Result Type (with pagination)

```graphql
type PostResult {
  rows: [Post!]!
  total: Int!
  page: Int!
  limit: Int!
}
```

## Queries

### Get Single Record

```graphql
query {
  post(id: 1) {
    id
    title
    body
    status
    createdAt
  }
}
```

### List Records

```graphql
query {
  postsList(page: 1, limit: 10, search: "hello", sort: "title", order: "asc") {
    rows {
      id
      title
      status
    }
    total
    page
    limit
  }
}
```

**Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | Int | Page number |
| `limit` | Int | Items per page |
| `search` | String | Full-text search |
| `sort` | String | Sort field |
| `order` | String | `asc` or `desc` |

## Mutations

### Create

```graphql
mutation {
  createPost(data: { title: "Hello", body: "World", authorId: 1 }) {
    id
    title
    body
  }
}
```

### Update

```graphql
mutation {
  updatePost(id: 1, data: { title: "Updated Title" }) {
    id
    title
  }
}
```

### Delete

```graphql
mutation {
  deletePost(id: 1) {
    id
  }
}
```

## Type Mapping

| YAML Type | GraphQL Type |
|---|---|
| `int` | `Int` |
| `bool` | `Int` (0/1) |
| `float` | `Float` |
| `string` | `String` |
| `text` | `String` |
| `email` | `String` |
| `file` | `String` |

## Relations

Relations are included as ID references:

```graphql
type Post {
  id: Int!
  title: String!
  authorId: Int    # Reference to User
}
```

To get related data, make a separate query:

```graphql
query {
  post(id: 1) {
    id
    title
    authorId
  }
  user(id: 1) {
    id
    name
    email
  }
}
```

## Examples

### Full Query

```graphql
query GetPosts {
  postsList(page: 1, limit: 5) {
    rows {
      id
      title
      status
      createdAt
    }
    total
    page
  }
}
```

### Create with Variables

```graphql
mutation CreatePost($data: PostInput!) {
  createPost(data: $data) {
    id
    title
  }
}
```

Variables:

```json
{
  "data": {
    "title": "New Post",
    "body": "Content",
    "authorId": 1
  }
}
```

### Multiple Queries

```graphql
query Dashboard {
  postsList(limit: 5) {
    rows { id title }
    total
  }
  usersList(limit: 5) {
    rows { id name }
    total
  }
}
```

## CLI Generation

```bash
zorux gen graphql
```

Generates GraphQL client code with typed queries and mutations.

## Authentication

GraphQL endpoints respect the same authentication policies as REST:

- `public` policies — No auth required
- `authenticated` policies — JWT required
- Role-based policies — User must have the role

Pass auth via header:

```
Authorization: Bearer <token>
```

## Error Handling

GraphQL errors are returned in the standard format:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Post not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["post"]
    }
  ]
}
```

## Limitations

- No nested mutations (create related records in one call)
- No subscriptions (use WebSocket for real-time)
- Relations are ID references only (no nested queries)
- No custom scalars (all mapped to standard types)
