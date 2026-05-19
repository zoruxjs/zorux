# Storage

Zorux supports multiple storage backends for file uploads.

## Providers

```yaml
storage:
  provider: local          # local | s3
  s3:
    endpoint: https://s3.amazonaws.com
    region: us-east-1
    bucket: my-bucket
    accessKey: AKIA...
    secretKey: ...
```

| Provider | Default | Env Vars |
|----------|---------|----------|
| `local` | `public/uploads/` | — |
| `s3` | — | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` |

## Usage

Models with `file` type fields automatically upload to storage:

```yaml
models:
  Post:
    fields:
      image: file
```

Upload via multipart form-data:

```bash
curl -F "image=@photo.jpg" http://localhost:3000/api/posts
```

The field stores the URL returned by the storage provider.
