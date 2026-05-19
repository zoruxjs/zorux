# Mobile App

Zorux generates a complete Expo (React Native) mobile app from your YAML models.

## Generate

```bash
fw gen mobile
```

Creates a `mobile/` directory with:

```
mobile/
├── app/                  # Expo Router pages
│   └── (tabs)/
│       ├── _layout.tsx   # Tab navigation
│       ├── index.tsx     # Dashboard with model list
│       └── {model}/      # Per-model screens
│           ├── index.tsx # List
│           ├── [id].tsx  # Detail
│           └── new.tsx   # Create
├── src/
│   ├── api/              # Auto-generated SDK per model
│   │   ├── client.ts     # HTTP client with auth
│   │   ├── auth.ts       # Auth API
│   │   └── {model}.ts    # Typed CRUD API
│   ├── components/
│   │   └── ui.tsx        # UI components
│   └── hooks/
│       └── useAuth.ts    # Auth context
└── app.json
```

## Run

```bash
cd mobile
bun install
bun start
```

Features:
- Auth screens (login, register)
- Per-model list, detail, create screens
- Typed API SDK per model
- Auth guard on navigation
- Pull-to-refresh
