# Deploy

<!-- maturity: 🔬 Experimental -->
> **🔬 Experimental** — This feature is in early development — not recommended for production


Zorux supports deployment to Docker, Vercel, Netlify, and Cloudflare Workers.

## Docker

### Dockerfile

```dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install --production

COPY . .

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]
```

### Build and Run

```bash
# Build image
docker build -t my-app .

# Run container
docker run -p 3000:3000 \
  -e JWT_SECRET=your-secret \
  -e DATABASE_URL=postgres://... \
  my-app
```

### Docker Compose

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - JWT_SECRET=your-secret
      - DATABASE_URL=postgres://postgres:pass@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=myapp
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

### CLI

```bash
zorux deploy docker
```

Generates Dockerfile and docker-compose.yml.

## Vercel

### Configuration

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ]
}
```

### Environment Variables

Set in Vercel dashboard:

| Variable | Description |
|---|---|
| `JWT_SECRET` | JWT signing secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |

### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

### CLI

```bash
zorux deploy vercel
```

Generates `vercel.json` configuration.

### Notes

- Vercel serverless functions have a 10-second timeout
- Use PostgreSQL (not SQLite) for Vercel deployments
- WebSocket is not supported on Vercel serverless

## Netlify

### Configuration

```toml
# netlify.toml
[build]
  command = "bun run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/app"
  status = 200
```

### Function Handler

```typescript
// netlify/functions/app.ts
import { handler } from "../../dist/index.js"

export default handler
```

### Environment Variables

Set in Netlify dashboard.

### Deploy

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Production deploy
netlify deploy --prod
```

### CLI

```bash
zorux deploy netlify
```

### Notes

- Netlify functions have a 10-second timeout
- Use PostgreSQL (not SQLite)
- WebSocket is not supported

## Cloudflare Workers

### Configuration

```toml
# wrangler.toml
name = "my-app"
main = "dist/index.js"
compatibility_date = "2026-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "xxx"

[[kv_namespaces]]
binding = "KV"
id = "xxx"

[[queues.producers]]
queue = "my-app-jobs"
binding = "JOBS"
```

### Worker Entry

```typescript
// src/worker.ts
import app from "../dist/index.js"

export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx)
  }
}
```

### Environment Variables

```bash
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL
```

### Deploy

```bash
# Install Wrangler
npm i -g wrangler

# Deploy
wrangler deploy
```

### CLI

```bash
zorux deploy cloudflare
```

### Notes

- Uses Cloudflare D1 for database
- Uses Cloudflare KV for caching
- Uses Cloudflare Queues for background jobs
- WebSocket is supported via Durable Objects
- No file system access (use R2 for storage)

## Production Checklist

### Security

- [ ] Change JWT secret from default
- [ ] Enable HTTPS
- [ ] Set `NODE_ENV=production`
- [ ] Remove debug logging
- [ ] Enable rate limiting
- [ ] Configure CSP headers

### Database

- [ ] Use PostgreSQL or MySQL (not SQLite)
- [ ] Run migrations: `zorux db migrate`
- [ ] Set up backups
- [ ] Configure connection pooling

### Cache

- [ ] Use Redis or Upstash (not memory)
- [ ] Configure TTL appropriately

### Storage

- [ ] Use S3 or R2 (not local filesystem)
- [ ] Configure CDN for static assets

### Monitoring

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure health checks
- [ ] Set up log aggregation

### Performance

- [ ] Enable caching
- [ ] Use a CDN
- [ ] Configure connection pooling
- [ ] Set up auto-scaling

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `JWT_SECRET` | JWT signing secret (change from default!) |

### Database

| Variable | Description |
|---|---|
| `DATABASE_URL` | Database connection string |

### Cache

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis connection URL |
| `UPSTASH_REDIS_REST_URL` | Upstash URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token |

### Email

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SMTP_HOST` | SMTP server |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

### Storage

| Variable | Description |
|---|---|
| `S3_BUCKET` | S3 bucket name |
| `S3_REGION` | S3 region |
| `S3_ACCESS_KEY` | S3 access key |
| `S3_SECRET_KEY` | S3 secret key |
| `S3_ENDPOINT` | Custom S3 endpoint |

### Payments

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `POLAR_TOKEN` | Polar API token |

### OAuth

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret |

### Captcha

| Variable | Description |
|---|---|
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |
| `RECAPTCHA_SITE_KEY` | Google reCAPTCHA site key |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA secret |
