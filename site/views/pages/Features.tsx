import type { FC } from "hono/jsx"
import { SiteLayout } from "../components/SiteLayout"

const features = [
  { cat: "🔐 Authentication & Authorization", items: [
    "35 OAuth Providers — Google, GitHub, Apple, Discord, Facebook, Twitter, LinkedIn, Microsoft, GitLab, Slack, Spotify, Twitch, e mais 23",
    "WebAuthn / Passkey — Autenticação sem senha com biometria (Touch/Face ID) e chaves de segurança",
    "2FA TOTP + Recovery Codes — Google Authenticator, Authy, 1Password",
    "Magic Link + Email OTP — Login sem senha via link ou código de uso único",
    "API Keys — Gerenciamento de chaves com rate limiting por chave e rota",
    "Organizations / Teams — Múltiplas organizações, invites por email, papéis owner/admin/member",
    "OAuth Provider (IdP) — Permita login com sua app via OAuth 2.0 + OpenID Connect",
    "ABAC + RBAC + Policy Engine — Expressões: ==, !=, >, in, matches, exists, &&, ||, !, grouping, derived roles, field-level, audit trail",
  ]},
  { cat: "🚀 API & Backend", items: [
    "CRUD Automático — Rotas REST para cada modelo com paginação, sort, search, field filtering",
    "OpenAPI / Swagger — Especificação 3.0 gerada automaticamente + Swagger UI",
    "GraphQL — Schema, queries e mutations gerados dos models",
    "Webhooks com HMAC — Disparo automático em CRUD com assinatura HMAC-SHA256",
    "Audit Log — Toda operação registrada: usuário, model, valores anteriores/novos, IP",
    "Background Jobs — Filas persistentes com retry exponencial e agendamento por delay",
    "Soft Delete + Restore — Deleção lógica com restore e permanent delete",
    "Bulk + Import/Export — Operações em lote, import CSV/JSON, export CSV/JSON/XLSX",
  ]},
  { cat: "📊 Admin UI", items: [
    "Dashboard — Cards de estatísticas, gráfico SVG, atividade recente",
    "CRUD com Rich Text — Lista/search/sort/paginação, formulários com Trix editor",
    "File Upload — Upload com validação de tipo, sanitização e storage providers",
    "Email Sandbox — Emails capturados em memória com visualizador em /admin/emails",
    "Feature Flags UI — Gerenciamento visual de flags com toggle",
    "Health Monitor — Página de monitoramento com status dos serviços",
    "Theme Toggle + PWA — Modo claro/escuro, manifesto, service worker",
    "Turbo SPA Navigation — Navegação sem reload com WebSocket refresh",
  ]},
  { cat: "🔌 Plugins & Integrações", items: [
    "NPM Auto-Detect — 12 adaptadores: Hono, Express, Passport, Koa, Fastify, install(), setup()",
    "Database: 7 Providers — SQLite, PostgreSQL, MySQL, MongoDB, Cloudflare D1, Supabase, :memory:",
    "Cache: 8 Providers — Memory, Redis, Upstash, Memcached, DynamoDB, SQLite, CF KV, CF DO",
    "Storage: 3 Providers — Local, S3 (AWS/MinIO/R2/Spaces), Supabase Storage",
    "Email: 5 Providers — Fake (sandbox), Log, Resend, SendGrid, SMTP/Nodemailer",
    "Payments: Stripe + Polar — Checkout, subscriptions, webhooks, customer management",
  ]},
  { cat: "📱 Multi-Output", items: [
    "Mobile (Expo) — zorux gen mobile gera app React Native com SDK tipado",
    "Desktop (Tauri) — zorux gen desktop gera aplicativo Tauri v2",
    "PWA — Manifest + service worker + ícones gerados automaticamente",
    "Admin UI — Interface web completa em /admin",
  ]},
]

export const FeaturesPage: FC = () => (
  <SiteLayout title="Features" active="features">
    <div style="padding-top:100px">
      <div class="section" style="padding-top:0">
        <div class="section-header">
          <div class="section-label">● Features</div>
          <h1 style="font-size:3rem;font-weight:700;margin-bottom:12px">47 features nativas</h1>
          <p class="section-subtitle">Cada recurso é opcional, lazy-loaded, e funciona sem configuração extra.</p>
        </div>
      </div>
      {features.map(cat => (
        <div class="section" style="padding-top:0;padding-bottom:40px">
          <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:20px">{cat.cat}</h2>
          <div class="feat-grid">
            {cat.items.map(item => {
              const [title, ...desc] = item.split(" — ")
              return (
                <div class="feat-item">
                  <span class="check" style="flex-shrink:0;margin-top:2px">✓</span>
                  <div>
                    <h4>{title}</h4>
                    <p>{desc.join(" — ")}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
    <section class="cta">
      <h2>Quer ver funcionando?</h2>
      <p>Instale e crie seu primeiro projeto em segundos.</p>
      <a href="/install" class="btn btn-primary btn-lg">Get Started →</a>
    </section>
  </SiteLayout>
)
