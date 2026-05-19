# Storage

Zorux supports 3 storage providers for file uploads: local filesystem, S3-compatible, and Supabase Storage.

## Configuration

```yaml
storage:
  provider: local               # local | s3
  s3:
    endpoint: string
    region: string
    bucket: string
    accessKey: string
    secretKey: string
    publicUrl: boolean
```

## Providers

### Local Filesystem

Files are stored in `public/uploads/`.

```yaml
storage:
  provider: local
```

**Upload path:** `public/uploads/{tableName}/{timestamp}-{random}.{ext}`

**URL:** `/uploads/{tableName}/{timestamp}-{random}.{ext}`

### S3-Compatible

Works with AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, and any S3-compatible service.

```yaml
storage:
  provider: s3
  s3:
    endpoint: "https://s3.amazonaws.com"    # Optional (for MinIO, R2, etc.)
    region: "us-east-1"
    bucket: "my-bucket"
    accessKey: "${S3_ACCESS_KEY}"
    secretKey: "${S3_SECRET_KEY}"
    publicUrl: true
```

**Environment Variables:**

| Variable | Description |
|---|---|
| `S3_ENDPOINT` | Custom endpoint (optional) |
| `S3_REGION` | AWS region |
| `S3_BUCKET` | Bucket name |
| `S3_ACCESS_KEY` | Access key ID |
| `S3_SECRET_KEY` | Secret access key |

### S3 Providers

| Service | Endpoint | Notes |
|---|---|---|
| AWS S3 | `https://s3.{region}.amazonaws.com` | Default |
| MinIO | `http://localhost:9000` | Self-hosted |
| Cloudflare R2 | `https://{accountId}.r2.cloudflarestorage.com` | No egress fees |
| DigitalOcean Spaces | `https://{region}.digitaloceanspaces.com` | S3-compatible |
| Backblaze B2 | `https://s3.{region}.backblazeb2.com` | Low cost |

### Supabase Storage

```yaml
supabase:
  url: "https://xxx.supabase.co"
  anonKey: "xxx"
  serviceKey: "xxx"

storage:
  provider: supabase
```

## Provider Interface

```typescript
interface StorageProvider {
  upload(name: string, data: Uint8Array | Blob): Promise<string>
  url(path: string): string
}
```

## File Upload API

Models with `file` fields accept multipart form data:

```bash
POST /api/posts
Content-Type: multipart/form-data

title: "My Post"
body: "Content"
coverImage: <file>
```

### File Storage Path

Files are stored as:

```
{tableName}/{timestamp}-{random}.{ext}
```

Example: `posts/1704067200000-a1b2c3d4.jpg`

### File URL Response

```json
{
  "id": 1,
  "title": "My Post",
  "coverImage": "/uploads/posts/1704067200000-a1b2c3d4.jpg"
}
```

For S3 with `publicUrl: true`:

```json
{
  "coverImage": "https://my-bucket.s3.amazonaws.com/posts/1704067200000-a1b2c3d4.jpg"
}
```

## File Validation

### MIME Type Detection

Files are validated by MIME type, not just extension.

### Blocked Extensions

These extensions are blocked by default:

```
.exe, .bat, .cmd, .com, .scr, .pif, .msi, .js, .vbs, .wsf, .php, .py, .rb, .pl, .sh
```

### Filename Sanitization

Filenames are sanitized to prevent:
- Path traversal (`../`)
- Null bytes (`\0`)
- Special characters
- Unicode homoglyphs

### Admin UI Upload

The admin panel provides:
- Drag & drop file upload
- File type validation
- Image preview
- Progress indicator

## Manual Upload

In custom actions:

```typescript
import { createStorageProvider } from "zorux/storage"

const storage = createStorageProvider(config.storage)

// Upload file
const path = await storage.upload("my-file.jpg", fileData)

// Get URL
const url = storage.url(path)
```
