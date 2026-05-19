# CLI Reference

```
fw new <name> [--api | --web | --mobile | --fullstack]
fw dev [port]
fw gen mobile
fw add model <Name> <field>:<type> [flags...]
fw seed [--count N] [Model:N ...]
fw deploy [--vercel] [--netlify] [--cloudflare]
fw test [--run] [--e2e] [--security]
fw audit
```

## fw new

Create a new project:

```bash
fw new my-app --fullstack
```

## fw dev

Start development server with hot reload:

```bash
fw dev               # Port 3000
fw dev 8080          # Port 8080
```

## fw add model

Add a new model to existing project:

```bash
fw add model Post title:string required body:text rating:int
fw add model Product name:string required price:float min:0
```

## fw seed

Populate database with test data:

```bash
fw seed                    # 5 records per model
fw seed Post:20 User:3     # Specific counts
fw seed --count 10         # All models get 10
```

## fw deploy

Generate deployment configuration:

```bash
fw deploy                  # All targets
fw deploy --docker         # Docker only
fw deploy --vercel         # Vercel only
fw deploy --netlify        # Netlify only
fw deploy --cloudflare     # Cloudflare Workers
```

## fw test

Generate and run tests:

```bash
fw test                    # Create integration tests
fw test --run              # Create + run
fw test --e2e              # Create E2E tests (Playwright)
fw test --security         # Create security tests
```

## fw audit

Security audit:

```bash
fw audit
```

Checks: JWT secret, .gitignore, hardcoded secrets, dependency vulnerabilities, CORS config.
