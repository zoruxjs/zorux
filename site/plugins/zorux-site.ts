// Zorux.dev — Laravel-inspired premium redesign
import { Hono } from "hono"

// ═══ i18n ═══
const LOC = { "en": {
  nav: {home:"Home",features:"Features",docs:"Docs",github:"GitHub",getStarted:"Get Started"},
  hero: {badge:"From zero to deploy",title:"The AI-native framework<br/>for multi-platform apps.",subtitle:"AI agents edit one YAML file. Zorux generates API, admin, mobile, desktop, auth, payments, real-time, and tests — across every platform. Token-efficient by design.",start:"Start Building",github:"View on GitHub",install:"npm install -g zorux"},
  features: {why:"Features",title:"Token-efficient. Multi-platform. AI-native.",sub:"47 features. Built for humans and AI agents. One file to rule them all.",auth:"Authentication",authSub:"Every auth method, zero setup.",platform:"Platform",platformSub:"One schema, every device.",data:"Data & Storage",dataSub:"Databases, cache, files — handled.",devex:"Developer Experience",devexSub:"Tools that make you faster.",security:"Security & Permissions",securitySub:"Enterprise-grade, built-in.",realtime:"Real-time & Events",realtimeSub:"Live updates, no infrastructure."},
  quick: {title:"Quick Start",sub:"Three commands. Ten seconds.",s1:"Install",s1d:"npm install -g zorux",s2:"Create",s2d:"zorux new my-app --saas",s3:"Run",s3d:"cd my-app && zorux dev"},
  cta: {title:"Built for humans and AI agents.",sub:"Stop wasting tokens on boilerplate. Let AI generate your entire app from one YAML file.",btn:"Get Started →"},
  footer: {built:"Built with Zorux in Brazil",made:"by SoftwareX",desc:"AI-native framework for multi-platform apps.",product:"Product",ecosystem:"Ecosystem",company:"Company"},
  docsPage: {title:"Documentation",intro:"Introduction",introText:"Zorux is an AI-first full-stack framework. A single <code>app.yaml</code> generates your entire application.",phil:"Philosophy",phil1:"<strong>One source of truth.</strong> Models, auth, permissions, plugins — one file.",phil2:"<strong>Batteries included.</strong> 35 OAuth, ABAC, WebSocket, jobs, email, storage, cache, payments.",quick:"Quick Start",arch:"Architecture",archTxt:"Bun runtime + Hono HTTP. YAML → models → DB → CRUD → admin → GraphQL → plugins.",gStart:"Getting Started",install:"Installation",ref:"Reference",yaml:"app.yaml",api:"API Routes",auth:"Authentication",abac:"ABAC Policies"},
  installPage: {title:"Installation",s1t:"Install",s1c:"npm install -g zorux",s2t:"Create",s2c:"zorux new my-app --saas",s3t:"Run",s3c:"cd my-app && zorux dev"},
}, "pt-BR": {
  nav: {home:"Início",features:"Recursos",docs:"Docs",github:"GitHub",getStarted:"Começar"},
  hero: {badge:"Do zero ao deploy",title:"O framework AI-native<br/>para aplicações multi-plataforma.",subtitle:"Agentes de IA editam um único YAML. Zorux gera API, admin, mobile, desktop, auth, pagamentos, tempo real e testes — em todas as plataformas. Eficiente em tokens por design.",start:"Começar",github:"Ver no GitHub",install:"npm install -g zorux"},
  features: {why:"Recursos",title:"Token-efficient. Multi-plataforma. Nativo em IA.",sub:"47 recursos nativos. Feito para humanos e IAs. Um arquivo para governar todos.",auth:"Autenticação",authSub:"Todo método de autenticação, zero configuração.",platform:"Plataforma",platformSub:"Um schema, todos os dispositivos.",data:"Dados & Armazenamento",dataSub:"Bancos, cache, arquivos — resolvido.",devex:"Experiência do Desenvolvedor",devexSub:"Ferramentas que te aceleram.",security:"Segurança & Permissões",securitySub:"Nível empresarial, embutido.",realtime:"Tempo Real & Eventos",realtimeSub:"Atualizações ao vivo, sem infraestrutura."},
  quick: {title:"Começo Rápido",sub:"Três comandos. Dez segundos.",s1:"Instale",s1d:"npm install -g zorux",s2:"Crie",s2d:"zorux new my-app --saas",s3:"Rode",s3d:"cd my-app && zorux dev"},
  cta: {title:"Feito para humanos e agentes de IA.",sub:"Pare de queimar tokens com boilerplate. Deixe a IA gerar seu app inteiro de um único YAML.",btn:"Começar →"},
  footer: {built:"Feito com Zorux no Brasil",made:"pela SoftwareX",desc:"Framework AI-native para aplicações multi-plataforma.",product:"Produto",ecosystem:"Ecossistema",company:"Empresa"},
  docsPage: {title:"Documentação",intro:"Introdução",introText:"Zorux é um framework full-stack AI-first. Um único <code>app.yaml</code> gera sua aplicação completa.",phil:"Filosofia",phil1:"<strong>Uma fonte de verdade.</strong> Models, auth, permissões, plugins — um arquivo.",phil2:"<strong>Completo.</strong> 35 OAuth, ABAC, WebSocket, jobs, email, armazenamento, cache, pagamentos.",quick:"Começo Rápido",arch:"Arquitetura",archTxt:"Bun + Hono. YAML → models → DB → CRUD → admin → GraphQL → plugins.",gStart:"Primeiros Passos",install:"Instalação",ref:"Referência",yaml:"app.yaml",api:"Rotas API",auth:"Autenticação",abac:"Políticas ABAC"},
  installPage: {title:"Instalação",s1t:"Instale",s1c:"npm install -g zorux",s2t:"Crie",s2c:"zorux new my-app --saas",s3t:"Rode",s3c:"cd my-app && zorux dev"},
}}

function lang(c:any): string {
  const q = c.req.query("lang"); if (q) return q
  const a = c.req.header("Accept-Language")||""
  const p = a.split(",").map((s:any)=>s.split(";")[0].trim())
  for (const l of p) { const b = l.split("-")[0]; if (b==="pt") return "pt-BR" }
  return "en"
}
function t(key:string, l:string): string {
  const parts = key.split("."); let o:any = LOC[l]||LOC["en"]
  for (const p of parts) { if (!o?.[p]) return key; o = o[p] }
  return typeof o==="string"?o:key
}

// ═══ Feature data with detailed descriptions ═══
const FEATURES = {
  auth: [
    {icon:"🔐",title:"35 OAuth Providers",desc:"Google, GitHub, Apple, Discord, Facebook, Twitter, LinkedIn, Slack, Spotify, Twitch, and 25 more. One-line config.",detail:"Every major OAuth provider built-in. No passport.js, no strategy packages. Just add the provider name to your YAML and get /api/auth/:provider routes automatically."},
    {icon:"🔑",title:"WebAuthn / Passkey",desc:"Passwordless login with biometrics. Fingerprint, Face ID, security keys.",detail:"Full WebAuthn/FIDO2 implementation. Register and authenticate with device biometrics. Credentials stored in _webauthn_credentials table with automatic challenge/response."},
    {icon:"📱",title:"2FA TOTP",desc:"Google Authenticator, Authy, 1Password. Recovery codes included.",detail:"Time-based one-time passwords with QR code setup. 10 recovery codes generated on enable. Stored as encrypted TOTP secrets in _totp_secrets table."},
    {icon:"✉️",title:"Magic Link + Email OTP",desc:"Passwordless login via email link or one-time code.",detail:"Send a magic link or 6-digit OTP to user email. Tokens expire in 15 minutes. Single-use only. Works with any email provider."},
    {icon:"🔑",title:"API Keys",desc:"Generate, revoke, rate-limit per key. Scoped permissions.",detail:"Users can create API keys with custom scopes. Each key has its own rate limit bucket. Keys are hashed with bcrypt before storage. Audit log tracks every key usage."},
    {icon:"🏢",title:"Organizations / Teams",desc:"Multi-org per user. Invites, roles (owner/admin/member).",detail:"Full organization system with _organizations, _org_members, _org_invites tables. Users can belong to multiple orgs. Role-based access at org level. Invite flow with email."},
    {icon:"🌐",title:"OAuth Provider (IdP)",desc:"Make your app an OAuth 2.0 + OIDC provider. JWKS, discovery.",detail:"Turn your Zorux app into an identity provider. Authorization code flow + PKCE. JWKS endpoint, OIDC discovery, userinfo. Other apps can log in via your app."},
    {icon:"🔗",title:"Social Account Linking",desc:"Link multiple OAuth providers to one account.",detail:"Users can connect Google, GitHub, Discord etc. to the same account. _social_accounts table tracks all linked providers. Seamless login from any linked provider."},
  ],
  platform: [
    {icon:"🌐",title:"REST API",desc:"Full CRUD with pagination, sort, search, field filtering.",detail:"Every model gets GET/POST/PUT/DELETE routes automatically. Pagination (?page=&limit=), sorting (?sort=field&order=asc), search (?q=), field filtering (?field=value). Bulk operations, import/export CSV/JSON/XLSX."},
    {icon:"📊",title:"Admin Panel",desc:"Dashboard with stats, CRUD tables, file upload, rich text.",detail:"Complete admin UI with stat cards, SVG charts, recent activity. Per-model CRUD with search, sort, pagination. Trix rich text editor. File upload with drag & drop. Email sandbox viewer."},
    {icon:"📱",title:"Mobile (Expo)",desc:"zorux gen mobile generates full React Native app.",detail:"Typed SDK per model. Auth screens with OAuth. Per-model CRUD screens. Realtime WebSocket hook. ImagePicker for file uploads. Pull-to-refresh. Form validation UI. Edit screens. Search."},
    {icon:"🖥️",title:"Desktop (Tauri)",desc:"zorux gen desktop generates native Tauri v2 app.",detail:"Full Tauri v2 project with Rust backend. Connects to your Zorux API. Native menus, system tray, file dialogs. Cross-platform: Windows, macOS, Linux."},
    {icon:"📲",title:"PWA",desc:"Manifest + service worker. Installable on any device.",detail:"Auto-generated manifest.json with icons. Service worker for offline caching. Install prompt on mobile and desktop. Works with all admin pages."},
    {icon:"◈",title:"GraphQL",desc:"Auto-generated schema from your models. Queries + mutations.",detail:"Schema generated from YAML models. Queries: {model} and {modelList} with pagination. Mutations: create, update, delete. POST /api/graphql endpoint. zorux gen graphql CLI."},
    {icon:"🎨",title:"6 Theme Adapters",desc:"Tailwind, DaisyUI, Ant Design, MUI, Chakra, Mantine.",detail:"zorux new --ui <framework>. Each adapter provides class mappings, component names, npm deps, Tailwind config, theme provider. Switch UI frameworks without changing your YAML."},
  ],
  data: [
    {icon:"🗄️",title:"7 Database Providers",desc:"SQLite, PostgreSQL, MySQL, MongoDB, Cloudflare D1, Supabase, :memory:",detail:"Unified DatabaseAdapter interface. SQL adapters use prepared statements. MongoDB uses collections. Switch providers by changing one line in YAML. Auto-migrations from model definitions."},
    {icon:"⚡",title:"8 Cache Providers",desc:"Memory, Redis, Upstash, Memcached, DynamoDB, SQLite, KV, DO.",detail:"Auto-caching middleware with X-Cache: HIT/MISS headers. Invalidates on write operations. TTL per model. Cloudflare KV and Durable Objects for edge caching."},
    {icon:"📦",title:"3 Storage Providers",desc:"Local filesystem, S3 (AWS/MinIO/R2/Spaces), Supabase.",detail:"File type validation (MIME + extension). Filename sanitization (path traversal protection). Upload to local disk or any S3-compatible service. Supabase Storage integration."},
    {icon:"📧",title:"5 Email Providers",desc:"Sandbox, Log, Resend, SendGrid, SMTP/Nodemailer.",detail:"Fake sandbox captures emails in-memory with /admin/emails viewer. Log provider for dev. Resend, SendGrid, SMTP for production. sendEmail({to, subject, html, text}) API."},
    {icon:"💳",title:"Stripe + Polar",desc:"Checkout sessions, subscriptions, webhooks, customers.",detail:"Full payment integration. Create checkout sessions, manage subscriptions, handle webhook events. Customer portal. Lazy-loaded — no Stripe SDK until you use it."},
    {icon:"🔍",title:"Meilisearch",desc:"Full-text search auto-indexed on CRUD. Multi-model.",detail:"Auto-sync on create/update/delete. GET /api/search/:model?q= for per-model. GET /api/search?q= for multi-model. Lazy-loaded — only requires meilisearch package when enabled."},
  ],
  devex: [
    {icon:"📝",title:"YAML Schema-First",desc:"One app.yaml defines everything. No route files. No config.",detail:"Models, fields, relations, auth, policies, plugins — all in one file. Convention over configuration. Zero boilerplate. AI agents can generate and modify your entire app by editing one file."},
    {icon:"🧪",title:"Auto-Generated Tests",desc:"Integration, validation, edge cases, security, e2e, fuzz, concurrent.",detail:"Every scaffold generates a full test suite: helpers for auth, in-memory DB setup, CRUD integration tests, validation checks, edge cases, security tests, CI/CD pipeline. zorux test generates additional tests for your models. 371 framework tests, 0 failures."},
    {icon:"🚀",title:"25+ CLI Commands",desc:"new, dev, gen, add, make, seed, deploy, db, audit, docs, scaffold, test, console, runner, credentials, plugin, completion.",detail:"Complete CLI for every workflow: zorux new (--api/--web/--mobile/--fullstack/--saas/--all --ui). zorux dev (hot reload). zorux gen mobile/desktop/pwa/graphql. zorux add model. zorux make action/job/migration. zorux seed. zorux db migrate/reset/rollback/status/schema dump. zorux deploy docker/vercel/netlify/cloudflare. zorux test --run/--e2e/--security. zorux scaffold forum/blog/ecommerce/saas. zorux console (REPL). zorux runner. zorux credentials setup/edit/show. zorux plugin list/add/remove. zorux audit. zorux docs. zorux info. zorux completion bash/zsh/fish."},
    {icon:"🔄",title:"Hot Reload",desc:"fs.watch detects changes. Server restarts automatically.",detail:"File watcher detects changes to app.yaml, plugins/, actions/, locales/. Automatic server restart. Preserves database connection. Works across all environments."},
    {icon:"🐳",title:"Deploy Anywhere",desc:"Docker, Vercel, Netlify, Cloudflare Workers. zorux deploy.",detail:"Dockerfile auto-generated. Vercel adapter with serverless functions. Netlify edge functions. Cloudflare Workers with D1/KV/Queues. One command: zorux deploy <platform>."},
    {icon:"📋",title:"Scaffolds",desc:"Forum, blog, ecommerce, SaaS — pre-built apps with tests.",detail:"zorux scaffold forum/blog/ecommerce/saas generates complete apps with models, auth, policies, UI, custom actions, and full test suites. Great starting point for common app types. Fully customizable."},
  ],
  security: [
    {icon:"🛡️",title:"ABAC + RBAC",desc:"Expression engine: ==, !=, >, in, matches, exists, &&, ||.",detail:"Attribute-based access control with recursive descent parser. Field-level permissions. Derived roles. Conditions on any model field. Policies evaluated per-request with AST caching."},
    {icon:"📋",title:"Audit Log",desc:"Every create/update/delete logged. User, model, values, IP.",detail:"_audit_logs table captures all mutations. Old and new values stored as JSON. Queryable via GET /api/audit-logs?model=&action=. zorux audit CLI for analysis."},
    {icon:"🔒",title:"Security Headers",desc:"CSP, rate limiting (200/min), CSRF, body size limit (1MB).",detail:"Content-Security-Policy with strict defaults. Token bucket rate limiter. CSRF token protection. JSON depth limit. Input sanitization (null bytes, control chars). Filename sanitization."},
    {icon:"🗑️",title:"Soft Delete",desc:"deleted_at column. Restore endpoint. Permanent delete.",detail:"softDelete: true in YAML adds deleted_at column. List queries auto-filter soft-deleted records. POST /api/:model/:id/restore to recover. DELETE /api/:model/:id?permanent=true for hard delete."},
    {icon:"🏷️",title:"Multi-tenancy",desc:"scoped: true on models. X-Org-ID header filtering.",detail:"Models with scoped: true automatically filter by organization. Org membership verified on every request. FK-free org scoping in schema. Works with all CRUD operations."},
    {icon:"🚩",title:"Feature Flags",desc:"Toggle features via API or admin UI. In-memory cache.",detail:"_feature_flags table with key/value/enabled. POST/GET/PUT/DELETE /api/features/:key/toggle. Admin UI page for management. isFeatureEnabled() helper with in-memory cache."},
  ],
  realtime: [
    {icon:"🔔",title:"WebSocket",desc:"/ws endpoint. Pub/sub engine. Auto-page-refresh via Turbo.",detail:"Bun native WebSocket server. Pub/sub for channel-based messaging. Turbo-style SPA navigation with WebSocket refresh. Real-time notifications. Live dashboard updates."},
    {icon:"📡",title:"Webhooks",desc:"Auto-fire on CRUD. HMAC-SHA256 signed payloads.",detail:"Register webhook URLs in _webhooks table. POST/GET/PUT/DELETE /api/webhooks. Signed with X-Webhook-Signature header. Retry on failure. Per-model event filtering."},
    {icon:"⚙️",title:"Background Jobs",desc:"Persistent queues. Exponential backoff retry. Delayed scheduling.",detail:"_kai_jobs table for SQLite/Postgres/MySQL. MongoDB collection. Cloudflare Queues. Worker with configurable polling. Retry: 5s, 10s, 20s... Delayed scheduling. POST /api/jobs/:name/submit."},
    {icon:"📢",title:"Event System",desc:"emit(), on(), onAny(). Wildcard patterns. Priority ordering.",detail:"Built-in event emitter. emit(event, data), on(event, handler), onAny(handler). Wildcard patterns (posts.*). Priority ordering for handlers. Auto-emitted on CRUD operations."},
    {icon:"📊",title:"Telemetry / Metrics",desc:"Prometheus format. OTLP exporter. HTTP counters + histograms.",detail:"Built-in tracer with console and OTLP exporters. Counters and histograms for HTTP requests. /api/metrics endpoint returns Prometheus-format text. Request duration tracking."},
    {icon:"🌐",title:"i18n",desc:"Auto-detect Accept-Language. Locale files. ?lang= query.",detail:"Locale detection: Accept-Language header → cookie → default. t(key, vars?, locale?) function. JSON locale files from locales/ directory. Built-in English translations for admin UI."},
  ],
}

function renderFeatureCard(f:any, cls:string, i:number): string {
  return `<div class="feature-card anim" style="animation-delay:${i*0.1}s"><div class="fc-icon ${cls}">${f.icon}</div><h4 class="fc-title">${f.title}</h4><p class="fc-desc">${f.desc}</p><details class="fc-detail"><summary>More</summary><p class="fc-detail-text">${f.detail}</p></details></div>`
}

const A = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --white: #ffffff;
  --bg: #ffffff;
  --bg-muted: #fafafa;
  --bg-subtle: #f5f5f5;
  --bg-elevated: #fafafa;
  --bg-card: #ffffff;
  --bg-card-hover: #ffffff;
  --border: #e5e5e5;
  --border-light: #f0f0f0;
  --border-hover: #d4d4d4;
  --text: #171717;
  --text-secondary: #525252;
  --text-muted: #737373;
  --text-dim: #a3a3a3;
  --accent: #ff2d20;
  --accent-dark: #cc241a;
  --accent-glow: rgba(255,45,32,0.08);
  --accent-soft: rgba(255,45,32,0.04);
  --accent-gradient: linear-gradient(135deg, #ff2d20, #f43f5e);
  --accent-ring: rgba(255,45,32,0.35);
  --blue: #3b82f6;
  --cyan: #06b6d4;
  --emerald: #10b981;
  --amber: #f59e0b;
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --font-display: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'IBM Plex Mono', monospace;
  --container: min(100% - 3rem, 1280px);
  --navbar-height: 64px;
}

body {
  font-family: var(--font-display);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

.container { width: var(--container); margin: 0 auto; }

/* ── Alert Bar ── */
.alert-bar {
  display: flex; align-items: center; justify-content: center; gap: 0.75rem;
  height: 44px; padding: 0 1.5rem;
  background: linear-gradient(90deg, #fff1f1, var(--white));
  border-bottom: 1px solid var(--border-light);
  font-size: 0.875rem; color: var(--accent);
}
.alert-bar .alert-cta {
  display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 0.2rem 0.75rem; border-radius: 999px;
  border: 1px solid var(--border); background: var(--white);
  font-size: 0.75rem; font-weight: 500; color: var(--text);
  text-decoration: none; white-space: nowrap; transition: background 0.15s;
}
.alert-bar .alert-cta:hover { background: var(--bg-muted); }

/* ── Navbar ── */
.navbar {
  position: sticky; top: 0; z-index: 100;
  height: var(--navbar-height);
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0,0,0,0.09);
}
.navbar-inner {
  width: var(--container);
  display: flex; align-items: center; justify-content: space-between;
}
.navbar-brand {
  display: flex; align-items: center; gap: 0.6rem;
  font-weight: 800; font-size: 1.2rem; color: var(--text);
  text-decoration: none; flex-shrink: 0;
}
.navbar-logo {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--accent-gradient);
  display: grid; place-items: center;
  font-size: 0.9rem; font-weight: 900; color: white;
}
.navbar-links { display: flex; gap: 0.125rem; }
.navbar-links a {
  display: flex; align-items: center; height: 36px;
  padding: 0 0.85rem; border-radius: var(--radius-sm);
  color: var(--text-secondary); text-decoration: none;
  font-size: 0.9rem; font-weight: 500;
  transition: all 0.15s;
}
.navbar-links a:hover { color: var(--text); background: var(--accent-soft); }
.navbar-actions { display: flex; align-items: center; gap: 0.75rem; }
.navbar-toggle { display: none; }
.navbar-toggle-label {
  display: none; width: 34px; height: 34px; cursor: pointer;
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); position: relative;
}
.navbar-toggle-label::before, .navbar-toggle-label::after, .navbar-toggle-label span {
  content: ''; position: absolute; left: 50%; transform: translateX(-50%);
  width: 16px; height: 2px; background: var(--text-dim); border-radius: 1px; transition: all 0.3s;
}
.navbar-toggle-label::before { top: 10px; }
.navbar-toggle-label span { top: 16px; }
.navbar-toggle-label::after { top: 22px; }
.navbar-toggle:checked ~ .navbar-links {
  display: flex; flex-direction: column; position: absolute; top: var(--navbar-height); left: 0; right: 0;
  background: rgba(255,255,255,0.98); backdrop-filter: blur(20px);
  padding: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.09);
}
.navbar-toggle:checked ~ .navbar-links a { padding: 0.65rem 0.85rem; height: auto; }
.navbar-toggle:checked ~ .navbar-toggle-label::before { top: 16px; transform: translateX(-50%) rotate(45deg); }
.navbar-toggle:checked ~ .navbar-toggle-label span { opacity: 0; }
.navbar-toggle:checked ~ .navbar-toggle-label::after { top: 16px; transform: translateX(-50%) rotate(-45deg); }
.lang-select {
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-muted); padding: 0.35rem 0.5rem; font-size: 0.8rem; cursor: pointer;
  transition: border-color 0.15s;
}
.lang-select:hover { border-color: var(--border-hover); }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.55rem 1.25rem; border-radius: var(--radius-sm);
  font-weight: 600; font-size: 0.875rem; text-decoration: none; cursor: pointer;
  transition: all 0.15s; border: none; white-space: nowrap;
}
.btn-primary { background: var(--accent); color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.btn-primary:hover { background: var(--accent-dark); box-shadow: 0 4px 16px var(--accent-glow); }
.btn-secondary { background: var(--white); color: var(--text); border: 1px solid var(--border); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.btn-secondary:hover { background: var(--bg-muted); border-color: var(--border-hover); }
.btn-lg { padding: 0.75rem 1.75rem; font-size: 1rem; border-radius: var(--radius); }
.btn-arrow svg { transition: transform 0.15s; }
.btn-arrow:hover svg { transform: translateX(3px); }
.btn-primary.btn-arrow:hover svg { transform: translateX(3px); }

/* ── Noise Overlay ── */
.noise {
  position: fixed; inset: 0; z-index: 9999; pointer-events: none;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat; background-size: 256px 256px;
}

/* ── Hero ── */
.hero {
  position: relative; overflow: hidden;
  padding: 8rem 1.5rem 6rem;
  text-align: center;
}
.hero-grid {
  position: absolute; inset: 0; pointer-events: none;
  -webkit-mask-image: radial-gradient(70% 100% at 50% 100%, black 25%, transparent);
  mask-image: radial-gradient(70% 100% at 50% 100%, black 25%, transparent);
}
.hero-grid svg { width: 100%; height: 100%; color: rgba(0,0,0,0.06); }
.hero-content { position: relative; max-width: 52rem; margin: 0 auto; }
.hero .badge {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.35rem 0.9rem; border-radius: 999px;
  background: var(--accent-soft); border: 1px solid rgba(255,45,32,0.12);
  color: var(--accent); font-size: 0.8rem; font-weight: 600;
}
.hero .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
.hero h1 {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 900; line-height: 1.08;
  letter-spacing: -0.035em; margin: 1.25rem 0 1rem; color: var(--text);
}
.hero h1 .gradient-text {
  background: var(--accent-gradient);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.hero p {
  font-size: 1.2rem; color: var(--text-muted); max-width: 42rem;
  margin: 0 auto 2rem; line-height: 1.7;
}
.hero-actions {
  display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 2.5rem;
}
.install-block {
  display: inline-flex; align-items: center; gap: 0.75rem;
  background: var(--bg-muted); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 0.6rem 1rem 0.6rem 1.25rem;
  font-family: var(--font-mono); font-size: 0.85rem;
}
.install-block .prompt { color: var(--accent); }
.install-block .cmd { color: var(--text-muted); }
.stats {
  display: flex; justify-content: center; gap: 2.5rem; flex-wrap: wrap; margin-top: 2.5rem;
}
.stat { text-align: center; }
.stat-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.stat-label { font-size: 0.8rem; color: var(--text-dim); margin-top: 0.15rem; }

/* ── Section Common ── */
.section { padding: 6rem 1.5rem; }
.section-header { text-align: center; margin-bottom: 3.5rem; }
.section-label {
  display: inline-block;
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 0.3rem 0.85rem; border-radius: 999px;
  background: var(--accent-soft); color: var(--accent); margin-bottom: 1rem;
}
.section-title { font-size: clamp(1.75rem, 3.5vw, 3rem); font-weight: 800; letter-spacing: -0.025em; margin-bottom: 0.75rem; line-height: 1.15; }
.section-subtitle { font-size: 1.1rem; color: var(--text-muted); max-width: 34rem; margin: 0 auto; line-height: 1.6; }

/* ── Alternating Feature Sections ── */
.feature-section { padding: 6rem 1.5rem; }
.feature-section.alt { background: var(--bg-muted); border-top: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light); }
.feature-inner { max-width: 72rem; margin: 0 auto; }
.feature-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center;
}
.feature-text .ft-tag {
  display: inline-block;
  font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 0.25rem 0.75rem; border-radius: 999px;
  background: var(--accent-soft); color: var(--accent); margin-bottom: 1rem;
}
.feature-text h2 { font-size: clamp(1.5rem, 2.5vw, 2.25rem); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.75rem; line-height: 1.15; }
.feature-text p { font-size: 1rem; color: var(--text-muted); line-height: 1.7; margin-bottom: 1.25rem; }
.feature-list { list-style: none; padding: 0; }
.feature-list li {
  padding: 0.35rem 0; font-size: 0.9rem; color: var(--text-secondary);
  display: flex; align-items: flex-start; gap: 0.65rem;
}
.feature-list li::before { content: '→'; color: var(--accent); font-weight: 700; flex-shrink: 0; }

/* ── Code Preview ── */
.code-preview {
  background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-lg);
  overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.04);
}
.code-preview-header {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.65rem 1rem; border-bottom: 1px solid var(--border-light);
  background: var(--bg-muted);
}
.code-preview-dot { width: 10px; height: 10px; border-radius: 50%; }
.code-preview-dot.r { background: #ff5f57; }
.code-preview-dot.y { background: #febc2e; }
.code-preview-dot.g { background: #28c840; }
.code-preview-filename { margin-left: 0.65rem; font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono); }
.code-preview pre {
  padding: 1.25rem; margin: 0; overflow-x: auto;
  font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.7; color: var(--text-secondary);
  background: var(--bg);
}
.code-preview pre .kw { color: #d73a49; }
.code-preview pre .str { color: var(--emerald); }
.code-preview pre .cmt { color: #6a737d; font-style: italic; }
.code-preview pre .fn { color: var(--blue); }
.code-preview pre .num { color: var(--amber); }
.code-preview pre .type { color: #005cc5; }
.code-preview pre .prop { color: #6f42c1; }
.code-preview pre .prompt { color: var(--accent); font-weight: 600; user-select: none; }

.terminal-run { position: relative; }
.terminal-viewport {
  height: 320px; overflow: hidden; position: relative;
}
.terminal-viewport::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 48px;
  background: linear-gradient(transparent, var(--bg));
  pointer-events: none;
}
.terminal-track { will-change: transform; }
.terminal-scroll {
  padding: 1rem 1.25rem; margin: 0;
  font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.7;
  color: var(--text-secondary); background: var(--bg);
}
.terminal-scroll .tl { padding: 0; margin: 0; line-height: 1.6; }
.terminal-run.running .terminal-track {
  animation: terminal-scroll 14s linear infinite;
}
@keyframes terminal-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}

/* ── Showcase Cards ── */
.showcase { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.showcase-card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 1.75rem; transition: all 0.25s; position: relative; overflow: hidden;
}
.showcase-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: var(--accent-gradient); opacity: 0; transition: opacity 0.25s;
}
.showcase-card:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.06); }
.showcase-card:hover::before { opacity: 1; }
.sc-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: grid; place-items: center; font-size: 1.1rem; margin-bottom: 1rem;
  background: var(--bg-muted); border: 1px solid var(--border-light);
}
.showcase-card h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.4rem; }
.showcase-card p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; }

/* ── Steps ── */
.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; max-width: 48rem; margin: 0 auto; }
.step {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 1.75rem; text-align: center; transition: all 0.25s;
}
.step:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
.step-num {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--accent);
  display: grid; place-items: center; font-size: 1.1rem; font-weight: 800; color: white;
  margin: 0 auto 1rem;
}
.step h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.4rem; }
.step p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; }
.step pre {
  background: var(--bg-muted); border: 1px solid var(--border-light); border-radius: var(--radius-sm);
  padding: 0.5rem 0.75rem; font-family: var(--font-mono); font-size: 0.78rem;
  margin-top: 0.75rem; color: var(--text-muted); overflow-x: auto;
}

/* ── CTA ── */
.cta {
  text-align: center; padding: 6rem 1.5rem;
  background: linear-gradient(180deg, var(--white), var(--bg-muted));
  border-top: 1px solid var(--border-light);
}
.cta h2 { font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 800; margin-bottom: 0.65rem; letter-spacing: -0.02em; }
.cta p { color: var(--text-muted); font-size: 1.1rem; margin-bottom: 1.75rem; }

/* ── Footer ── */
.footer {
  background: var(--bg-muted); border-top: 1px solid var(--border);
  padding: 4rem 1.5rem 2rem;
}
.footer-inner { max-width: 72rem; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 3rem; }
.footer-brand .navbar-logo { margin-bottom: 0.75rem; }
.footer-brand p { font-size: 0.85rem; color: var(--text-muted); max-width: 22rem; line-height: 1.7; }
.footer-col h4 { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 1rem; }
.footer-col a { display: block; padding: 0.3rem 0; font-size: 0.85rem; color: var(--text-muted); text-decoration: none; transition: color 0.15s; }
.footer-col a:hover { color: var(--text); }
.footer-bottom {
  border-top: 1px solid var(--border-light); margin-top: 3rem; padding-top: 1.75rem;
  text-align: center; font-size: 0.8rem; color: var(--text-dim);
  max-width: 72rem; margin-left: auto; margin-right: auto;
}

/* ── Scroll to Top ── */
.scroll-top {
  position: fixed; bottom: 2rem; right: 2rem; width: 40px; height: 40px;
  border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border);
  color: var(--text-muted); font-size: 1.2rem; cursor: pointer;
  display: grid; place-items: center; opacity: 0; transform: translateY(10px);
  transition: all 0.25s; z-index: 50; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.scroll-top.visible { opacity: 1; transform: translateY(0); }
.scroll-top:hover { background: var(--bg-muted); border-color: var(--border-hover); color: var(--text); }

/* ── Feature Categories (for /features page) ── */
.feature-category { margin-bottom: 3.5rem; }
.feature-category:last-child { margin-bottom: 0; }
.cat-header { margin-bottom: 1.5rem; }
.cat-label {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 0.3rem 0.75rem; border-radius: 999px; margin-bottom: 0.65rem;
}
.cat-label.auth { background: rgba(255,45,32,0.08); color: var(--accent); }
.cat-label.platform { background: rgba(59,130,246,0.08); color: var(--blue); }
.cat-label.data { background: rgba(6,182,212,0.08); color: var(--cyan); }
.cat-label.devex { background: rgba(16,185,129,0.08); color: var(--emerald); }
.cat-label.security { background: rgba(245,158,11,0.08); color: var(--amber); }
.cat-label.realtime { background: rgba(236,72,153,0.08); color: #ec4899; }
.cat-title { font-size: 1.35rem; font-weight: 800; margin-bottom: 0.35rem; }
.cat-subtitle { font-size: 0.9rem; color: var(--text-muted); }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: 0.65rem; }
.feature-card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 1.15rem; transition: all 0.25s; cursor: default;
}
.feature-card:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
.feature-card .fc-icon {
  width: 34px; height: 34px; border-radius: 8px;
  display: grid; place-items: center; font-size: 0.95rem; margin-bottom: 0.65rem;
}
.fi-purple { background: rgba(255,45,32,0.08); }
.fi-blue { background: rgba(59,130,246,0.08); }
.fi-cyan { background: rgba(6,182,212,0.08); }
.fi-green { background: rgba(16,185,129,0.08); }
.fi-orange { background: rgba(245,158,11,0.08); }
.fi-pink { background: rgba(236,72,153,0.08); }
.feature-card h3 { font-size: 0.9rem; font-weight: 700; margin-bottom: 0.3rem; }
.feature-card .fc-title { font-size: 0.85rem; font-weight: 600; color: var(--text); margin-bottom: 0.3rem; }
.fc-desc { font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; }
.feature-card .fc-detail {
  max-height: 0; overflow: hidden; transition: max-height 0.3s ease, margin 0.3s ease, opacity 0.3s ease;
  opacity: 0; font-size: 0.78rem; color: var(--text-muted); line-height: 1.6;
  border-top: 1px solid transparent;
}
.feature-card:hover .fc-detail, .feature-card:active .fc-detail {
  max-height: 200px; opacity: 1; margin-top: 0.65rem; padding-top: 0.65rem;
  border-top-color: var(--border-light);
}
.feature-card:hover .fc-desc, .feature-card:active .fc-desc { display: none; }
.fc-detail summary { cursor: pointer; font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; margin-top: 0.4rem; }
.fc-detail-text { margin-top: 0.4rem; font-size: 0.78rem; color: var(--text-muted); line-height: 1.6; }

/* ── Docs ── */
.docs-layout { display: flex; max-width: 90rem; margin: 0 auto; min-height: calc(100vh - 64px); }
.docs-sidebar {
  width: 280px; flex-shrink: 0; padding: 2rem 1.25rem;
  border-right: 1px solid var(--border); position: sticky; top: 64px; height: calc(100vh - 64px); overflow-y: auto;
  background: var(--bg);
}
.docs-sidebar::-webkit-scrollbar { width: 4px; }
.docs-sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.docs-sidebar-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 0.5rem; margin-top: 1.75rem; padding-left: 0.75rem; }
.docs-sidebar-title:first-child { margin-top: 0; }
.docs-sidebar a {
  display: block; padding: 0.4rem 0.75rem; border-radius: var(--radius-sm);
  color: var(--text-muted); text-decoration: none; font-size: 0.85rem;
  transition: all 0.15s; border-left: 2px solid transparent;
}
.docs-sidebar a:hover { color: var(--text); background: var(--accent-soft); border-left-color: var(--accent); }
.docs-sidebar a.active { color: var(--accent); background: var(--accent-soft); font-weight: 600; border-left-color: var(--accent); }
.docs-content { flex: 1; padding: 3rem 4rem; max-width: 56rem; min-width: 0; }
.docs-content h1 { font-size: 2.25rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: -0.03em; line-height: 1.2; }
.docs-content h1:not(:first-child) { margin-top: 3rem; }
.docs-content h2 { font-size: 1.5rem; font-weight: 700; margin-top: 3rem; margin-bottom: 1rem; letter-spacing: -0.01em; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-light); }
.docs-content h3 { font-size: 1.15rem; font-weight: 650; margin-top: 2rem; margin-bottom: 0.75rem; }
.docs-content p { color: var(--text-muted); line-height: 1.8; margin-bottom: 1.25rem; font-size: 0.95rem; }
.docs-content a { color: var(--accent); text-decoration: none; border-bottom: 1px solid rgba(255,45,32,0.3); transition: border-color 0.2s; }
.docs-content a:hover { border-bottom-color: var(--accent); }
.docs-content strong { font-weight: 600; }
.docs-content hr { border: none; border-top: 1px solid var(--border-light); margin: 2.5rem 0; }
.docs-content ul, .docs-content ol { margin: 1rem 0 1.25rem 1.5rem; color: var(--text-muted); }
.docs-content li { margin-bottom: 0.5rem; font-size: 0.95rem; line-height: 1.7; }
.docs-content li::marker { color: var(--accent); }
.docs-content p code, .docs-content li code, .docs-content td code, .docs-content th code {
  font-family: var(--font-mono); font-size: 0.82rem;
  background: var(--bg-muted); border: 1px solid var(--border-light); border-radius: 4px;
  padding: 0.15rem 0.4rem; color: var(--accent);
}
.docs-content pre {
  background: var(--bg-muted); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 1.25rem 1.5rem; margin: 1.25rem 0 1.5rem; overflow-x: auto;
  font-size: 0.85rem; line-height: 1.7; position: relative;
}
.docs-content pre code { font-family: var(--font-mono); color: var(--text-secondary); background: none; border: none; padding: 0; font-size: inherit; }
.docs-content pre .lang-bash::before, .docs-content pre .lang-yaml::before,
.docs-content pre .lang-json::before, .docs-content pre .lang-ts::before,
.docs-content pre .lang-js::before, .docs-content pre .lang-sql::before,
.docs-content pre .lang-toml::before, .docs-content pre .lang-dockerfile::before,
.docs-content pre .lang-python::before, .docs-content pre .lang-rust::before,
.docs-content pre .lang-html::before, .docs-content pre .lang-css::before {
  position: absolute; top: 0.75rem; right: 1rem;
  font-size: 0.7rem; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;
  font-family: var(--font-display);
}
.docs-content pre .lang-bash::before { content: 'bash'; }
.docs-content pre .lang-yaml::before { content: 'yaml'; }
.docs-content pre .lang-json::before { content: 'json'; }
.docs-content pre .lang-ts::before { content: 'typescript'; }
.docs-content pre .lang-js::before { content: 'javascript'; }
.docs-content pre .lang-sql::before { content: 'sql'; }
.docs-content pre .lang-toml::before { content: 'toml'; }
.docs-content pre .lang-dockerfile::before { content: 'dockerfile'; }
.docs-content pre .lang-python::before { content: 'python'; }
.docs-content pre .lang-rust::before { content: 'rust'; }
.docs-content pre .lang-html::before { content: 'html'; }
.docs-content pre .lang-css::before { content: 'css'; }
.docs-content .table-wrap { margin: 1.5rem 0; overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); }
.docs-content table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.docs-content thead { background: var(--bg-muted); }
.docs-content th { padding: 0.85rem 1rem; text-align: left; font-weight: 600; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border-light); }
.docs-content td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-light); color: var(--text-muted); line-height: 1.6; }
.docs-content td code { font-family: var(--font-mono); font-size: 0.8rem; background: var(--bg-muted); border: 1px solid var(--border-light); border-radius: 3px; padding: 0.1rem 0.35rem; color: var(--accent); }
.docs-content tr:last-child td { border-bottom: none; }
.docs-content tr:hover td { background: var(--bg-muted); }
.docs-content blockquote {
  border-left: 3px solid var(--accent); background: var(--accent-soft);
  padding: 1rem 1.25rem; margin: 1.5rem 0; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.docs-content blockquote p { margin-bottom: 0.5rem; }
.docs-content blockquote p:last-child { margin-bottom: 0; }

/* ── Install Page ── */
.install-steps { display: flex; flex-direction: column; gap: 1rem; max-width: 40rem; }
.install-step {
  display: flex; gap: 1.25rem; align-items: flex-start;
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 1.5rem; transition: border-color 0.2s;
}
.install-step:hover { border-color: var(--border-hover); }
.install-num {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  background: var(--accent);
  display: grid; place-items: center; font-weight: 800; color: white;
}
.install-step h3 { font-weight: 700; margin-bottom: 0.5rem; }
.install-step pre {
  background: var(--bg-muted); border: 1px solid var(--border-light); border-radius: var(--radius-sm);
  padding: 0.6rem 1rem; font-family: var(--font-mono); font-size: 0.85rem; margin-top: 0.5rem;
}

/* ── Token Comparison Table ── */
.comparison-wrap { overflow-x: auto; margin: 0 -0.5rem; padding: 0 0.5rem; }
.comparison-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 640px; }
.comparison-table th { padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); text-align: left; border-bottom: 2px solid var(--border); }
.comparison-table td { padding: 0.65rem 1rem; font-size: 0.85rem; border-bottom: 1px solid var(--border-light); vertical-align: middle; }
.comparison-table tr:hover td { background: var(--bg-muted); }
.comparison-table .fw-name { font-weight: 600; color: var(--text); white-space: nowrap; }
.comparison-table .fw-name .badge-z { display: inline-block; font-size: 0.6rem; font-weight: 800; background: var(--accent); color: white; padding: 0.1rem 0.4rem; border-radius: 4px; margin-left: 0.4rem; vertical-align: middle; }
.comparison-table .token-cell { font-weight: 600; font-family: var(--font-mono); font-size: 0.8rem; }
.comparison-table .token-bar-wrap { width: 120px; height: 20px; background: var(--bg-muted); border-radius: 10px; overflow: hidden; position: relative; }
.comparison-table .token-bar { height: 100%; border-radius: 10px; background: var(--accent-gradient); transition: width 0.6s ease; }
.comparison-table .token-bar.bg-muted { background: var(--border); opacity: 0.4; }
.comparison-table .cost { font-family: var(--font-mono); font-size: 0.8rem; white-space: nowrap; }
.comparison-table .cost.high { color: var(--accent); }
.comparison-table .cost.low { color: var(--emerald); }
.comparison-table .savings { font-size: 0.75rem; font-weight: 700; color: var(--emerald); }
.compare-models { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 2rem; justify-content: center; }
.compare-model { padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; border: 1px solid var(--border-light); background: var(--bg-muted); color: var(--text-muted); }
.compare-model strong { color: var(--text); }

/* ── Animations ── */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.anim { animation: fadeInUp 0.5s both; }
.a1 { animation-delay: 0.1s; } .a2 { animation-delay: 0.2s; } .a3 { animation-delay: 0.3s; }
.a4 { animation-delay: 0.4s; } .a5 { animation-delay: 0.5s; } .a6 { animation-delay: 0.6s; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .feature-row { grid-template-columns: 1fr; gap: 2rem; }
  .showcase { grid-template-columns: repeat(2, 1fr); }
  .footer-inner { grid-template-columns: 1fr 1fr; gap: 2rem; }
  .docs-content { padding: 2rem 2rem; }
  .docs-sidebar { width: 240px; }
  .hero { padding: 5rem 1.5rem 4rem; }
  .section { padding: 4rem 1.5rem; }
  .feature-section { padding: 4rem 1.5rem; }
  .cta { padding: 4rem 1.5rem; }
}

@media (max-width: 768px) {
  .navbar { padding: 0; }
  .navbar-inner { padding: 0 1rem; }
  .navbar-links { display: none; }
  .navbar-toggle-label { display: block; }
  .stats { gap: 1.5rem; }
  .stat-value { font-size: 1.5rem; }
  .steps { grid-template-columns: 1fr; max-width: 24rem; }
  .showcase { grid-template-columns: 1fr; }
  .docs-layout { flex-direction: column; }
  .docs-sidebar { width: 100%; position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border); }
  .hero { padding: 4rem 1rem 3rem; }
  .hero h1 { font-size: clamp(1.75rem, 8vw, 3rem); }
  .hero p { font-size: 1rem; }
  .section { padding: 3.5rem 1rem; }
  .feature-section { padding: 3.5rem 1rem; }
  .section-title { font-size: clamp(1.35rem, 5vw, 1.75rem); }
  .cta { padding: 3.5rem 1rem; }
  .cta h2 { font-size: 1.5rem; }
  .cta p { font-size: 0.95rem; }
  .docs-content { padding: 1.5rem 1rem; }
  .footer { padding: 3rem 1rem 2rem; }
  .footer-inner { grid-template-columns: 1fr; gap: 2rem; text-align: center; }
  .footer-brand p { max-width: none; }
  .code-preview pre { font-size: 0.7rem; padding: 1rem; }
  .install-step { flex-direction: column; align-items: center; text-align: center; padding: 1rem; }
  .install-block { font-size: 0.75rem; padding: 0.5rem 0.75rem; }
  .btn-lg { padding: 0.65rem 1.35rem; font-size: 0.9rem; }
}

@media (max-width: 480px) {
  .hero { padding: 3rem 0.75rem 2.5rem; }
  .hero h1 { font-size: 1.75rem; }
  .hero p { font-size: 0.9rem; }
  .badge { font-size: 0.7rem; padding: 0.3rem 0.65rem; }
  .stat-value { font-size: 1.25rem; }
  .section { padding: 3rem 0.75rem; }
  .feature-section { padding: 3rem 0.75rem; }
  .cta { padding: 3rem 0.75rem; }
  .cta h2 { font-size: 1.35rem; }
  .showcase-card { padding: 1.25rem; }
  .step { padding: 1.25rem; }
  .step-num { width: 38px; height: 38px; font-size: 0.95rem; }
  .feature-card { padding: 0.9rem; }
  .docs-content h1 { font-size: 1.5rem; }
  .docs-content h2 { font-size: 1.15rem; }
  .docs-content p { font-size: 0.85rem; }
  .footer { padding: 2.5rem 0.75rem 1.5rem; }
  .footer-bottom { font-size: 0.7rem; }
  .install-step { padding: 0.75rem; }
  .install-num { width: 34px; height: 34px; font-size: 0.85rem; }
  .install-step pre { font-size: 0.75rem; padding: 0.45rem 0.65rem; }
  .code-block { font-size: 0.7rem; padding: 0.45rem 0.65rem; }
  .lang-select { font-size: 0.7rem; padding: 0.25rem 0.35rem; }
  .btn { padding: 0.45rem 0.9rem; font-size: 0.8rem; }
  .btn-lg { padding: 0.55rem 1.1rem; font-size: 0.85rem; }
}
`

const FEATURE_ICONS = {
  auth: { icon: "🔐", cls: "fi-purple" },
  platform: { icon: "🌐", cls: "fi-blue" },
  data: { icon: "🗄️", cls: "fi-cyan" },
  devex: { icon: "⚡", cls: "fi-green" },
  security: { icon: "🛡️", cls: "fi-orange" },
  realtime: { icon: "🔔", cls: "fi-pink" },
}

export default {
  name:"zorux-site",version:"1.0.0",description:"Zorux.dev — Laravel-inspired premium redesign",
  onRoutes(app:Hono){
    const locales = ["en","pt-BR"]

    app.get("/static/daisyui.min.css",async(c)=>{
      try{const{readFileSync,existsSync}=await import("fs");const{join}=await import("path");const p=join(import.meta.dir,"../views/static/daisyui.min.css");if(existsSync(p))return c.text(readFileSync(p,"utf-8"),200,{"Content-Type":"text/css"})}catch{}
      return c.text("",404)
    })

    function P(title:string, body:string, l:string): string {
      const L=(k:string)=>t(k,l); const sel=(v:string)=>l===v?"selected":""
      return `<!DOCTYPE html><html lang="${l}"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${title} — Zorux</title><link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23ff2d20'/><text x='50' y='68' text-anchor='middle' fill='white' font-size='50' font-weight='bold' font-family='system-ui'>Z</text></svg>"><style>${A}</style></head><body>
<div class="noise"></div>
<div class="alert-bar">
  <span>AI agents edit one YAML. We ship the rest. From zero to deploy.</span>
  <a href="/install" class="alert-cta">Get Started</a>
</div>
<nav class="navbar">
  <div class="navbar-inner">
    <a href="/" class="navbar-brand"><span class="navbar-logo">Z</span>Zorux</a>
    <input type="checkbox" id="nav-toggle" class="navbar-toggle" aria-label="Toggle menu" />
    <label for="nav-toggle" class="navbar-toggle-label" aria-label="Toggle menu"><span></span></label>
    <div class="navbar-links">
      <a href="/">${L("nav.home")}</a>
      <a href="/features">${L("nav.features")}</a>
      <a href="/docs">${L("nav.docs")}</a>
      <a href="https://github.com/zoruxjs/zorux">${L("nav.github")}</a>
    </div>
    <div class="navbar-actions">
      <select onchange="window.location.href=window.location.pathname+'?lang='+this.value" class="lang-select">
        ${locales.map(lc => `<option value="${lc}" ${sel(lc)}>${lc.toUpperCase()}</option>`).join("")}
      </select>
      <a href="/install" class="btn btn-primary">${L("nav.getStarted")}</a>
  </div>
</div>
</nav>
${body}
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <a href="/" class="navbar-brand"><span class="navbar-logo" style="width:32px;height:32px;font-size:1rem">Z</span>Zorux</a>
      <p>${L("footer.desc")}</p>
    </div>
    <div class="footer-col">
      <h4>${L("footer.product")}</h4>
      <a href="/features">${L("nav.features")}</a>
      <a href="/docs">${L("nav.docs")}</a>
      <a href="/install">${L("nav.getStarted")}</a>
      <a href="https://github.com/zoruxjs/zorux">GitHub</a>
    </div>
    <div class="footer-col">
      <h4>${L("footer.ecosystem")}</h4>
      <a href="/docs/yaml">YAML Reference</a>
      <a href="/docs/api">API Docs</a>
      <a href="/docs/auth">${L("features.auth")}</a>
      <a href="/docs/cli">CLI</a>
    </div>
    <div class="footer-col">
      <h4>${L("footer.company")}</h4>
      <a href="https://softwarex.com.br">SoftwareX</a>
      <a href="https://github.com/zoruxjs/zorux">${L("nav.github")}</a>
    </div>
  </div>
  <div class="footer-bottom">
    <span>${L("footer.built")}</span>
    <span>${L("footer.made")}</span>
  </div>
</footer>
</body></html>`
    }

    // ═══ Home ═══
    app.get("/", c=>{
      const l=lang(c); const L=(k:any)=>t(k,l)
      return c.html(P(L("hero.title"),`
<section class="hero anim a1">
  <div class="hero-grid">
    <svg width="100%" height="100%"><defs><pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="transparent" stroke="currentColor" stroke-width="1"/></pattern></defs><rect fill="url(#grid)" width="100%" height="100%"/></svg>
  </div>
  <div class="hero-content">
    <div class="badge"><span class="badge-dot"></span>${L("hero.badge")}</div>
    <h1>Build multi-platform apps with<br/><span class="gradient-text">one YAML file</span></h1>
    <p>${L("hero.subtitle")}</p>
    <div class="hero-actions">
      <a href="/install" class="btn btn-primary btn-lg btn-arrow">${L("hero.start")} <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      <a href="https://github.com/zoruxjs/zorux" class="btn btn-secondary btn-lg">${L("hero.github")}</a>
    </div>
    <div class="install-block"><span class="prompt">$</span><span class="cmd">${L("hero.install")}</span></div>
    <div class="stats">
      <div class="stat"><div class="stat-value">47</div><div class="stat-label">Features</div></div>
      <div class="stat"><div class="stat-value">371</div><div class="stat-label">Tests</div></div>
      <div class="stat"><div class="stat-value">0</div><div class="stat-label">Failures</div></div>
      <div class="stat"><div class="stat-value">90%</div><div class="stat-label">Less Boilerplate</div></div>
    </div>
  </div>
</section>

<div class="feature-section alt">
  <div class="feature-inner">
    <div class="section-header anim">
      <div class="section-label">AI-Native Platform</div>
      <h2 class="section-title">One YAML. Every platform. Zero boilerplate.</h2>
      <p class="section-subtitle">Built for humans and AI agents. Describe your app once — get API, admin, mobile, desktop, PWA, GraphQL, auth, payments, and tests. Token-efficient by design.</p>
    </div>
    <div class="showcase anim a2">
      <div class="showcase-card"><div class="sc-icon">🗄️</div><h3>7 Databases</h3><p>SQLite, PostgreSQL, MySQL, MongoDB, Cloudflare D1, Supabase, :memory: — switch with one config line.</p></div>
      <div class="showcase-card"><div class="sc-icon">🔐</div><h3>35 OAuth Providers</h3><p>Google, GitHub, Apple, Discord & 31 more. WebAuthn, 2FA TOTP, magic links, API keys, organizations.</p></div>
      <div class="showcase-card"><div class="sc-icon">📱</div><h3>Mobile + Desktop + PWA</h3><p>Expo (React Native), Tauri v2 (Rust), PWA. One command generates each platform.</p></div>
      <div class="showcase-card"><div class="sc-icon">⚡</div><h3>8 Cache Providers</h3><p>Memory, Redis, Upstash, Memcached, DynamoDB, SQLite, Cloudflare KV, Durable Objects.</p></div>
      <div class="showcase-card"><div class="sc-icon">💳</div><h3>Stripe + Polar</h3><p>Checkout sessions, subscriptions, webhooks, customer portal. Lazy-loaded — zero overhead.</p></div>
      <div class="showcase-card"><div class="sc-icon">🧪</div><h3>Auto-Generated Tests</h3><p>Integration, validation, edge cases, security, e2e, fuzz, concurrent. CI/CD included.</p></div>
    </div>
  </div>
</div>

<div class="feature-section">
  <div class="feature-inner">
    <div class="section-header anim">
      <div class="section-label">Token Economics</div>
      <h2 class="section-title">99% less tokens.<br/>99% less cost.</h2>
      <p class="section-subtitle">Zorux: <strong>600 tokens</strong> → API, admin, mobile, desktop, PWA, GraphQL, auth, payments, real-time & tests. Others: <strong>5,200–7,500 tokens</strong> → web only, plus 5–10 paid libraries just to catch up.</p>
    </div>
    <div class="comparison-wrap anim a2">
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Framework</th>
          <th>Tokens</th>
          <th>vs Zorux</th>
          <th>Claude Opus 4.7</th>
          <th>Codex GPT-5.5</th>
          <th>Gemini 3.1</th>
          <th>DeepSeek V4</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="fw-name">Zorux <span class="badge-z">AI-native</span></td>
          <td class="token-cell" style="color:var(--emerald)">600</td>
          <td class="savings">—</td>
          <td class="cost low">$0.009</td>
          <td class="cost low">$0.006</td>
          <td class="cost low">$0.003</td>
          <td class="cost low">$0.001</td>
        </tr>
        <tr>
          <td class="fw-name">Rails</td>
          <td class="token-cell">3,800<div class="token-bar-wrap"><div class="token-bar" style="width:51%"></div></div></td>
          <td class="savings">6.3×</td>
          <td class="cost high">$0.057</td>
          <td class="cost">$0.038</td>
          <td class="cost">$0.019</td>
          <td class="cost">$0.008</td>
        </tr>
        <tr>
          <td class="fw-name">Laravel</td>
          <td class="token-cell">4,500<div class="token-bar-wrap"><div class="token-bar" style="width:60%"></div></div></td>
          <td class="savings">7.5×</td>
          <td class="cost high">$0.068</td>
          <td class="cost">$0.045</td>
          <td class="cost">$0.023</td>
          <td class="cost">$0.009</td>
        </tr>
        <tr>
          <td class="fw-name">Next.js</td>
          <td class="token-cell">5,200<div class="token-bar-wrap"><div class="token-bar" style="width:69%"></div></div></td>
          <td class="savings">8.7×</td>
          <td class="cost high">$0.078</td>
          <td class="cost">$0.052</td>
          <td class="cost">$0.026</td>
          <td class="cost">$0.010</td>
        </tr>
        <tr>
          <td class="fw-name">Vue + Express</td>
          <td class="token-cell">6,000<div class="token-bar-wrap"><div class="token-bar" style="width:80%"></div></div></td>
          <td class="savings">10×</td>
          <td class="cost high">$0.090</td>
          <td class="cost">$0.060</td>
          <td class="cost">$0.030</td>
          <td class="cost">$0.012</td>
        </tr>
        <tr>
          <td class="fw-name">React + Express</td>
          <td class="token-cell">6,500<div class="token-bar-wrap"><div class="token-bar" style="width:87%"></div></div></td>
          <td class="savings">10.8×</td>
          <td class="cost high">$0.098</td>
          <td class="cost">$0.065</td>
          <td class="cost">$0.033</td>
          <td class="cost">$0.013</td>
        </tr>
        <tr>
          <td class="fw-name">Angular + Express</td>
          <td class="token-cell">7,500<div class="token-bar-wrap"><div class="token-bar" style="width:100%"></div></div></td>
          <td class="savings">12.5×</td>
          <td class="cost high">$0.113</td>
          <td class="cost">$0.075</td>
          <td class="cost">$0.038</td>
          <td class="cost">$0.015</td>
        </tr>
      </tbody>
    </table>
    </div>
    <p style="text-align:center;font-size:0.8rem;color:var(--text-dim);margin-top:1rem">Tokens for AI to scaffold 5 models + auth + admin per stack. Zorux also generates mobile, desktop, PWA, GraphQL, payments, real-time & tests — others require separate frameworks for each, multiplying token costs.</p>
    <div class="compare-models">
      <span class="compare-model">Claude Opus 4.7 — <strong>$15/M</strong> tokens</span>
      <span class="compare-model">Codex GPT-5.5 — <strong>$10/M</strong> tokens</span>
      <span class="compare-model">Gemini 3.1 Pro — <strong>$5/M</strong> tokens</span>
      <span class="compare-model">DeepSeek V4 — <strong>$2/M</strong> tokens</span>
    </div>
  </div>
</div>

<div class="feature-section">
  <div class="feature-inner">
    <div class="feature-row anim">
      <div class="feature-text">
        <div class="ft-tag">AI-First Workflow</div>
        <h2>AI agents edit one file.<br/>We ship the rest.</h2>
        <p>AI agents can read, understand, and modify your entire app by editing a single <code>app.yaml</code>. No sprawling codebases. No context window limits. One file generates API, admin, mobile, desktop, PWA, GraphQL, and tests.</p>
        <ul class="feature-list">
          <li>Full CRUD with pagination, search, sort, field filtering</li>
          <li>Admin dashboard with charts, file upload, rich text</li>
          <li>Expo mobile app with typed SDK per model</li>
          <li>Tauri desktop app with native menus</li>
          <li>GraphQL schema auto-generated from models</li>
          <li>OpenAPI/Swagger docs at /api/docs</li>
        </ul>
      </div>
      <div class="code-preview">
        <div class="code-preview-header">
          <span class="code-preview-dot r"></span><span class="code-preview-dot y"></span><span class="code-preview-dot g"></span>
          <span class="code-preview-filename">app.yaml</span>
        </div>
<pre><span class="kw">models</span>:
  <span class="type">Post</span>:
    <span class="prop">fields</span>:
      <span class="str">title</span>: string <span class="kw">required</span> max:<span class="num">200</span>
      <span class="str">body</span>: text <span class="kw">required</span>
      <span class="str">status</span>: string <span class="kw">enum</span>:draft,published
      <span class="str">author</span>: <span class="type">User</span>
    <span class="prop">timestamps</span>: <span class="kw">true</span>
    <span class="prop">policies</span>:
      <span class="str">list</span>: <span class="str">"*"</span>
      <span class="str">create</span>: <span class="str">authenticated</span>
      <span class="str">update</span>: <span class="str">owner</span>
      <span class="str">delete</span>: <span class="str">admin</span>
</pre>
      </div>
    </div>
  </div>
</div>

<div class="feature-section alt">
  <div class="feature-inner">
    <div class="feature-row anim">
      <div class="code-preview">
        <div class="code-preview-header">
          <span class="code-preview-dot r"></span><span class="code-preview-dot y"></span><span class="code-preview-dot g"></span>
          <span class="code-preview-filename">app.yaml</span>
        </div>
<pre><span class="kw">auth</span>:
  <span class="prop">model</span>: <span class="type">User</span>
  <span class="prop">registration</span>: <span class="str">open</span>
  <span class="prop">roles</span>: [<span class="str">admin</span>, <span class="str">editor</span>, <span class="str">user</span>]
  <span class="prop">social</span>:
    <span class="str">google</span>:
      <span class="prop">clientId</span>: <span class="str">\${GOOGLE_CLIENT_ID}</span>
      <span class="prop">clientSecret</span>: <span class="str">\${GOOGLE_CLIENT_SECRET}</span>
  <span class="prop">organization</span>:
    <span class="prop">enabled</span>: <span class="kw">true</span>
    <span class="prop">roles</span>: [<span class="str">owner</span>, <span class="str">admin</span>, <span class="str">member</span>]
</pre>
      </div>
      <div class="feature-text">
        <div class="ft-tag">Authentication</div>
        <h2>Every auth method.<br/>Zero setup.</h2>
        <p>35 OAuth providers, WebAuthn passkeys, 2FA TOTP, magic links, email OTP, API keys, organizations with invites, and social account linking — all configured in one YAML file. AI agents can wire up any auth flow in seconds.</p>
        <ul class="feature-list">
          <li>Google, GitHub, Discord, Apple + 31 more one-liner configs</li>
          <li>WebAuthn/FIDO2 biometric login with passkeys</li>
          <li>Multi-session with refresh tokens</li>
          <li>OAuth 2.0 + OIDC provider mode with JWKS</li>
          <li>Organization teams with role-based access</li>
          <li>ABAC policy engine with expression parser</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<div class="feature-section">
  <div class="feature-inner">
    <div class="feature-row anim">
      <div class="feature-text">
        <div class="ft-tag">CLI</div>
        <h2>25+ commands.<br/>Every workflow.</h2>
        <p>From scaffolding to deployment, the CLI handles everything. AI agents can scaffold, test, and deploy without touching a terminal. Generate mobile apps, run tests, manage databases — all from one tool.</p>
        <ul class="feature-list">
          <li>Scaffold forum, blog, ecommerce, SaaS apps</li>
          <li>Auto-generate integration + validation + security tests</li>
          <li>Database migrate, rollback, status, and schema dump</li>
          <li>Deploy to Docker, Vercel, Netlify, Cloudflare Workers</li>
          <li>Hot reload via fs.watch on app.yaml, plugins, actions</li>
          <li>Interactive REPL console and custom script runner</li>
        </ul>
      </div>
      <div class="code-preview terminal-run" data-terminal>
        <div class="code-preview-header">
          <span class="code-preview-dot r"></span><span class="code-preview-dot y"></span><span class="code-preview-dot g"></span>
          <span class="code-preview-filename">terminal</span>
        </div>
        <div class="terminal-viewport">
          <div class="terminal-track">
<pre class="terminal-scroll">
<div class="tl cmt"># Create a full SaaS app</div>
<div class="tl"><span class="prompt">$</span> zorux new my-app --saas</div>
<div class="tl str">⚡ Creating project: my-app</div>
<div class="tl str">✅ Created app.yaml + actions + tests</div>
<div class="tl">&nbsp;</div>
<div class="tl cmt"># Run dev server</div>
<div class="tl"><span class="prompt">$</span> cd my-app && zorux dev</div>
<div class="tl str">⚡ Server running on http://localhost:3000</div>
<div class="tl"><span class="fn">API:</span>     /api</div>
<div class="tl"><span class="fn">Admin:</span>   /admin</div>
<div class="tl"><span class="fn">WS:</span>      /ws</div>
<div class="tl"><span class="fn">Swagger:</span> /api/docs</div>
<div class="tl">&nbsp;</div>
<div class="tl cmt"># Generate mobile app</div>
<div class="tl"><span class="prompt">$</span> zorux gen mobile</div>
<div class="tl str">✅ Expo project generated</div>
<div class="tl">&nbsp;</div>
<div class="tl cmt"># Run 371 tests</div>
<div class="tl"><span class="prompt">$</span> zorux test</div>
<div class="tl str">✅ 371 pass · 0 fail · 636 expects</div>
</pre>
<pre class="terminal-scroll">
<div class="tl cmt"># Create a full SaaS app</div>
<div class="tl"><span class="prompt">$</span> zorux new my-app --saas</div>
<div class="tl str">⚡ Creating project: my-app</div>
<div class="tl str">✅ Created app.yaml + actions + tests</div>
<div class="tl">&nbsp;</div>
<div class="tl cmt"># Run dev server</div>
<div class="tl"><span class="prompt">$</span> cd my-app && zorux dev</div>
<div class="tl str">⚡ Server running on http://localhost:3000</div>
<div class="tl"><span class="fn">API:</span>     /api</div>
<div class="tl"><span class="fn">Admin:</span>   /admin</div>
<div class="tl"><span class="fn">WS:</span>      /ws</div>
<div class="tl"><span class="fn">Swagger:</span> /api/docs</div>
<div class="tl">&nbsp;</div>
<div class="tl cmt"># Generate mobile app</div>
<div class="tl"><span class="prompt">$</span> zorux gen mobile</div>
<div class="tl str">✅ Expo project generated</div>
<div class="tl">&nbsp;</div>
<div class="tl cmt"># Run 371 tests</div>
<div class="tl"><span class="prompt">$</span> zorux test</div>
<div class="tl str">✅ 371 pass · 0 fail · 636 expects</div>
</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="feature-section alt">
  <div class="feature-inner">
    <div class="section-header anim">
      <div class="section-label">${L("quick.title")}</div>
      <h2 class="section-title">${L("quick.title")}</h2>
      <p class="section-subtitle">${L("quick.sub")}</p>
    </div>
    <div class="steps">
      <div class="step anim a2"><div class="step-num">1</div><h3>${L("quick.s1")}</h3><pre>$ ${L("quick.s1d")}</pre></div>
      <div class="step anim a3"><div class="step-num">2</div><h3>${L("quick.s2")}</h3><pre>$ ${L("quick.s2d")}</pre></div>
      <div class="step anim a4"><div class="step-num">3</div><h3>${L("quick.s3")}</h3><pre>$ ${L("quick.s3d")}</pre></div>
    </div>
  </div>
</div>

<div class="cta anim a3">
  <h2>${L("cta.title")}</h2>
  <p>${L("cta.sub")}</p>
  <a href="/install" class="btn btn-primary btn-lg btn-arrow">${L("cta.btn")} <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
</div>`,l))
    })

    // ═══ Features ═══
    app.get("/features", c=>{
      const l=lang(c); const L=(k:any)=>t(k,l)
      const cats = [
        {key:"auth",cls:"auth",icon:"🔐",title:L("features.auth"),sub:L("features.authSub")},
        {key:"platform",cls:"platform",icon:"🌐",title:L("features.platform"),sub:L("features.platformSub")},
        {key:"data",cls:"data",icon:"🗄️",title:L("features.data"),sub:L("features.dataSub")},
        {key:"devex",cls:"devex",icon:"⚡",title:L("features.devex"),sub:L("features.devexSub")},
        {key:"security",cls:"security",icon:"🛡️",title:L("features.security"),sub:L("features.securitySub")},
        {key:"realtime",cls:"realtime",icon:"🔔",title:L("features.realtime"),sub:L("features.realtimeSub")},
      ]
      const colorMap:any = {auth:"fi-purple",platform:"fi-blue",data:"fi-cyan",devex:"fi-green",security:"fi-orange",realtime:"fi-pink"}
      return c.html(P("Features",`
<div class="section">
  <div class="section-header anim a1">
    <div class="section-label">47 Features</div>
    <h1 class="section-title">${L("features.title")}</h1>
    <p class="section-subtitle">${L("features.sub")}</p>
  </div>
  ${cats.map((cat:any)=>{
    const items = FEATURES[cat.key as keyof typeof FEATURES] || []
    return `<div class="feature-category anim"><div class="cat-header"><span class="cat-label ${cat.cls}">${cat.icon} ${cat.title}</span><h3 class="cat-title">${cat.title}</h3><p class="cat-subtitle">${cat.sub}</p></div><div class="feature-grid">${items.map((f:any,i:number)=>renderFeatureCard(f,colorMap[cat.cls],i)).join("")}</div></div>`
  }).join("")}
</div>`,l))
    })

    // ═══ Docs ═══
    const DOCS_DIR = import.meta.dir.replace(/plugins$/, "") + "../docs"
    const DOCS_NAV = [
      {group:"Getting Started",items:[{slug:"getting-started",label:"Getting Started"},{slug:"yaml",label:"YAML Reference"}]},
      {group:"Core",items:[{slug:"api",label:"API Reference"},{slug:"auth",label:"Authentication"},{slug:"admin",label:"Admin Panel"},{slug:"cli",label:"CLI Reference"}]},
      {group:"Data & Storage",items:[{slug:"database",label:"Database"},{slug:"cache",label:"Cache"},{slug:"storage",label:"Storage"},{slug:"email",label:"Email"}]},
      {group:"Features",items:[{slug:"jobs",label:"Background Jobs"},{slug:"payments",label:"Payments"},{slug:"realtime",label:"Real-time"},{slug:"webhooks",label:"Webhooks"},{slug:"graphql",label:"GraphQL"}]},
      {group:"Platform",items:[{slug:"mobile",label:"Mobile (Expo)"},{slug:"desktop",label:"Desktop (Tauri)"},{slug:"pwa",label:"PWA"}]},
      {group:"Advanced",items:[{slug:"plugins",label:"Plugins"},{slug:"security",label:"Security"},{slug:"i18n",label:"i18n"},{slug:"telemetry",label:"Telemetry"},{slug:"deploy",label:"Deploy"},{slug:"architecture",label:"Architecture"}]},
    ]

    function md2html(md:string): string {
      let html = md
      const codeBlocks: string[] = []
      html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_,lang,code) => {
        const idx = codeBlocks.length
        codeBlocks.push(`<pre><code class="lang-${lang}">${code.trim().replace(/</g,"&lt;").replace(/>/g,"&gt;")}</code></pre>`)
        return `%%CODEBLOCK_${idx}%%`
      })
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      const inlineCodes: string[] = []
      html = html.replace(/`([^`]+)`/g, (_,code) => {
        const idx = inlineCodes.length
        inlineCodes.push(`<code>${code.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</code>`)
        return `%%INLINE_${idx}%%`
      })
      html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
      html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
      html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
      html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
      html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_,header,sep,body) => {
        const ths = header.split('|').filter(c=>c.trim()).map(c=>`<th>${c.trim()}</th>`).join('')
        const rows = body.trim().split('\n').map(row => {
          const tds = row.split('|').filter(c=>c.trim()).map(c=>`<td>${c.trim()}</td>`).join('')
          return `<tr>${tds}</tr>`
        }).join('')
        return `<div class="table-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`
      })
      html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
      html = html.replace(/^---$/gm, '<hr>')
      html = html.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>')
      html = html.replace(/((?:<oli>.*<\/oli>\n?)+)/g, '<ol>$1</ol>')
      html = html.replace(/<oli>/g, '<li>')
      html = html.replace(/<\/oli>/g, '</li>')
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
      html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
      html = html.replace(/^(?!<[a-z/])((?!%%).+)$/gm, '<p>$1</p>')
      html = html.replace(/<p><\/p>/g, '')
      html = html.replace(/<p>(<h[1-4]>)/g, '$1')
      html = html.replace(/(<\/h[1-4]>)<\/p>/g, '$1')
      html = html.replace(/<p>(<ul>)/g, '$1')
      html = html.replace(/(<\/ul>)<\/p>/g, '$1')
      html = html.replace(/<p>(<ol>)/g, '$1')
      html = html.replace(/(<\/ol>)<\/p>/g, '$1')
      html = html.replace(/<p>(<div)/g, '$1')
      html = html.replace(/(<\/div>)<\/p>/g, '$1')
      html = html.replace(/<p>(<blockquote>)/g, '$1')
      html = html.replace(/(<\/blockquote>)<\/p>/g, '$1')
      html = html.replace(/<p>(<hr>)/g, '$1')
      html = html.replace(/(<hr>)<\/p>/g, '$1')
      codeBlocks.forEach((block,i) => { html = html.replace(`%%CODEBLOCK_${i}%%`, block) })
      inlineCodes.forEach((code,i) => { html = html.replace(`%%INLINE_${i}%%`, code) })
      html = html.replace(/<p>(<pre>)/g, '$1')
      html = html.replace(/(<\/pre>)<\/p>/g, '$1')
      return html
    }

    function docsBody(activeSlug:string, contentHtml:string, l:string): string {
      const L=(k:string)=>t(k,l)
      const sidebarItems = DOCS_NAV.map(g =>
        `<div class="docs-sidebar-title">${g.group}</div>` +
        g.items.map(i => `<a href="/docs/${i.slug}" class="${i.slug===activeSlug?'active':''}">${i.label}</a>`).join('')
      ).join('')
      return `<div class="docs-layout"><aside class="docs-sidebar"><a href="/docs" class="${activeSlug===''?'active':''}">${L("docsPage.intro")}</a>${sidebarItems}</aside><main class="docs-content">${contentHtml}</main></div>`
    }

    app.get("/docs", c=>{
      const l=lang(c); const L=(k:any)=>t(k,l)
      const cards = DOCS_NAV.map(g =>
        `<div style="margin-bottom:2rem"><h3 style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin-bottom:0.85rem;padding-left:0.75rem">${g.group}</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:0.5rem">${g.items.map(i=>`<a href="/docs/${i.slug}" style="display:block;padding:0.75rem 1rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);text-decoration:none;font-size:0.9rem;font-weight:500;transition:all 0.2s;border-left:2px solid transparent" onmouseover="this.style.borderColor='var(--border-hover)';this.style.borderLeftColor='var(--accent)';this.style.transform='translateX(2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.borderLeftColor='transparent';this.style.transform='none'">${i.label}</a>`).join('')}</div></div>`
      ).join('')
      return c.html(P(L("docsPage.title"),`<div class="section"><div class="section-header anim a1"><div class="section-label">Documentation</div><h1 class="section-title">${L("docsPage.title")}</h1><p class="section-subtitle">Complete reference for every feature, endpoint, and command.</p></div><div class="anim a2" style="max-width:56rem;margin:0 auto">${cards}</div></div>`,l))
    })

    app.get("/docs/:slug", async c=>{
      const l=lang(c); const L=(k:any)=>t(k,l)
      const slug = c.req.param("slug")
      const {readFileSync,existsSync} = await import("fs")
      const filePath = DOCS_DIR + `/${slug}.md`
      if (!existsSync(filePath)) return c.html(P("Not Found", `<div class="section" style="text-align:center"><h1 style="font-size:4rem;font-weight:900;color:var(--text-dim);margin-bottom:1rem">404</h1><p style="color:var(--text-muted);margin-bottom:2rem">Page not found</p><a href="/docs" class="btn btn-primary">Back to Docs</a></div>`,l), 404)
      const md = readFileSync(filePath, "utf-8")
      const html = md2html(md)
      const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g,' ')
      return c.html(P(title, docsBody(slug, html, l), l))
    })

    // ═══ Install ═══
    app.get("/install", c=>{
      const l=lang(c); const L=(k:any)=>t(k,l)
      return c.html(P(L("installPage.title"),`
<div class="section">
  <h1 class="section-title anim a1" style="margin-bottom:2.5rem">${L("installPage.title")}</h1>
  <div class="install-steps">
    <div class="install-step anim a2"><div class="install-num">1</div><div><h3>${L("installPage.s1t")}</h3><pre>$ ${L("installPage.s1c")}</pre></div></div>
    <div class="install-step anim a3"><div class="install-num">2</div><div><h3>${L("installPage.s2t")}</h3><pre>$ ${L("installPage.s2c")}</pre></div></div>
    <div class="install-step anim a4"><div class="install-num">3</div><div><h3>${L("installPage.s3t")}</h3><pre>$ ${L("installPage.s3c")}</pre></div></div>
  </div>
</div>`,l))
    })

    app.get("/quickstart",c=>c.redirect("/install"))
    app.get("/yaml",c=>c.redirect("/docs/yaml"))
    app.get("/api",c=>c.redirect("/docs/api"))
    app.get("/auth",c=>c.redirect("/docs/auth"))
    app.get("/abac",c=>c.redirect("/docs/security"))

    console.log("  Zorux.dev: Laravel-inspired premium redesign")
  },
}
