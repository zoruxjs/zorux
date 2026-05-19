import type { FC } from "hono/jsx"
import { SiteLayout } from "../components/SiteLayout"

export const LandingPage: FC = () => (
  <SiteLayout title="Build anything from a single YAML" active="home">
    <section class="hero">
      <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:100px;background:var(--accent-bg);border:1px solid var(--accent-border);font-size:0.8rem;color:var(--accent-light);margin-bottom:24px">
        <span style="width:6px;height:6px;border-radius:50%;background:var(--accent-light)"></span>
        v0.1.7 — 47 features, zero config
      </div>
      <h1>Um arquivo.<br/>O framework inteiro.</h1>
      <p class="hero-subtitle">Zorux transforma um único app.yaml em API REST, Admin UI, Mobile (Expo), Desktop (Tauri), PWA, GraphQL, webhooks, jobs, auth com 35 OAuth providers, e muito mais.</p>
      <div class="hero-actions">
        <a href="/install" class="btn btn-primary btn-lg">Get Started →</a>
        <a href="https://github.com/zoruxjs/zorux" class="btn btn-ghost btn-lg">View on GitHub</a>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><div class="hero-stat-value">47</div><div class="hero-stat-label">Features nativas</div></div>
        <div class="hero-stat"><div class="hero-stat-value">371</div><div class="hero-stat-label">Testes, 0 falhas</div></div>
        <div class="hero-stat"><div class="hero-stat-value">~6k</div><div class="hero-stat-label">req/s CRUD real</div></div>
        <div class="hero-stat"><div class="hero-stat-value">35</div><div class="hero-stat-label">OAuth providers</div></div>
      </div>
    </section>

    <div class="section">
      <div class="section-header">
        <div class="section-label">● Why Zorux</div>
        <h2 class="section-title">Tudo que um SaaS precisa, nativo.</h2>
        <p class="section-subtitle">Sem gems, sem packages, sem configuração manual. Cada feature é built-in e funciona imediatamente.</p>
      </div>
      <div class="grid-3">
        {[
          { i: "⚡", t: "Zero Configuration", d: "1 YAML define models, auth, database, plugins. Sem arquivos de rota, migrations ou config manual." },
          { i: "🔐", t: "Auth Completa", d: "35 OAuth providers, WebAuthn/Passkey, 2FA TOTP, Magic Link, OTP, API Keys, Organizations, OAuth Provider (IdP)." },
          { i: "🛡️", t: "ABAC + RBAC", d: "Engine de políticas com expressões: ==, !=, >, in, matches, exists, &&, ||, grouping, derived roles, field-level." },
          { i: "📱", t: "Multi-Output", d: "Do mesmo schema: API REST + Admin UI + Mobile (Expo) + Desktop (Tauri) + PWA." },
          { i: "🔌", t: "NPM Plugins", d: "Qualquer pacote npm funciona. Express, Hono, Passport — detecção automática, sem wrappers." },
          { i: "📊", t: "Admin UI", d: "Dashboard, CRUD, rich text, file upload, email sandbox, feature flags, theme toggle, PWA, Turbo SPA." },
          { i: "🔔", t: "Realtime", d: "WebSocket + Pub/Sub + Turbo-style SPA. Auto-push de mudanças sem dependências externas." },
          { i: "📋", t: "GraphQL + Webhooks + Audit", d: "GraphQL auto-gerado. Webhooks com HMAC. Audit log. Feature flags. Tudo nativo." },
          { i: "🚀", t: "Performance", d: "Bun + Hono: ~6.000 req/s CRUD real. Prepared statements cacheados, AST cache, login em 0.36ms." },
        ].map(f => (
          <div class="card">
            <div class="card-icon">{f.i}</div>
            <h3>{f.t}</h3>
            <p>{f.d}</p>
          </div>
        ))}
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-label">● Quick Start</div>
        <h2 class="section-title">Comece em segundos</h2>
        <p class="section-subtitle">Instale, crie, desenvolva. Seu SaaS rodando em menos de 10s.</p>
      </div>
      <div style="display:flex;gap:48px;flex-wrap:wrap">
        <div class="steps" style="flex:1">
          <div class="step"><div class="step-n">1</div><div><h4>Instale</h4><p>npm install -g zorux</p></div></div>
          <div class="step"><div class="step-n">2</div><div><h4>Crie</h4><p>zorux new my-app --saas</p></div></div>
          <div class="step"><div class="step-n">3</div><div><h4>Desenvolva</h4><p>cd my-app && zorux dev</p></div></div>
          </div>
        <div class="terminal" style="flex:1;margin:0">
          <div class="terminal-bar"><span class="terminal-dot"></span><span class="terminal-dot"></span><span class="terminal-dot"></span></div>
          <pre><span class="cm">$</span> <span class="kw">npm install -g zorux</span>
<span class="cm">$</span> <span class="kw">zorux new</span> my-saas --saas
<span class="cm">  ✔ Created: app.yaml, actions/, jobs/</span>
<span class="cm">$</span> cd my-saas
<span class="cm">$</span> <span class="kw">zorux dev</span>
<span class="cm">  ⚡ Zorux dev server</span>
<span class="cm">  API:  http://localhost:3000/api</span>
<span class="cm">  Web:  http://localhost:3000/admin</span></pre>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-label">● Comparison</div>
        <h2 class="section-title">Zorux vs. outros frameworks</h2>
        <p class="section-subtitle">Mais features nativas que Rails, Laravel ou Next.js. Menos configuração que qualquer alternativa.</p>
      </div>
      <div class="table-wrap">
        <table>
          <tr><th>Feature</th><th>Zorux</th><th>Rails</th><th>Next.js</th><th>Strapi</th></tr>
          <tr><td>1 YAML → Full-stack</td><td class="check">✓</td><td class="cross">✗</td><td class="cross">✗</td><td class="cross">✗</td></tr>
          <tr><td>Auth nativo completo</td><td class="check">✓</td><td class="cross">✗</td><td class="cross">✗</td><td class="cross">✗</td></tr>
          <tr><td>Mobile + Desktop gerados</td><td class="check">✓</td><td class="cross">✗</td><td class="cross">✗</td><td class="cross">✗</td></tr>
          <tr><td>Admin UI automático</td><td class="check">✓</td><td class="partial">±</td><td class="cross">✗</td><td class="check">✓</td></tr>
          <tr><td>ABAC + Policy Engine</td><td class="check">✓</td><td class="partial">±</td><td class="cross">✗</td><td class="cross">✗</td></tr>
          <tr><td>Plugins npm automáticos</td><td class="check">✓</td><td class="cross">✗</td><td class="check">✓</td><td class="cross">✗</td></tr>
          <tr><td>GraphQL + Webhooks + Jobs + Audit</td><td class="check">✓ Nativo</td><td class="cross">✗ Gems</td><td class="cross">✗</td><td class="partial">±</td></tr>
          <tr><td>Performance (req/s real)</td><td><strong>~6.000</strong></td><td>~2.500</td><td>~4.000</td><td>~1.500</td></tr>
        </table>
      </div>
    </div>

    <section class="cta">
      <h2>Pronto para construir?</h2>
      <p>Um comando. Segundos. SaaS completo.</p>
      <a href="/install" class="btn btn-primary btn-lg">Get Started →</a>
    </section>
  </SiteLayout>
)
