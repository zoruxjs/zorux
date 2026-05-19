# Deployment

```bash
fw deploy
```

Generates configuration for all platforms.

## Docker

```bash
docker build -t my-app .
docker run -p 3000:3000 my-app
```

## Vercel

```bash
vercel deploy
```

## Netlify

```bash
netlify deploy
```

## Cloudflare Workers

```bash
npm install -g wrangler
wrangler deploy
```

## Fly.io

```bash
fly launch
fly deploy
```

## Railway

```bash
railway init
railway up
```
