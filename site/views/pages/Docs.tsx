import type { FC } from "hono/jsx"
import { SiteLayout, DocSidebar } from "../components/SiteLayout"

export const DocsPage: FC = () => (
  <SiteLayout title="Documentation" active="docs">
    <div class="docs">
      <DocSidebar active="introduction" />
      <main class="docs-main">
        <h1>Introduction to Zorux</h1>
        <p>Zorux is an <strong>AI-first full-stack framework</strong>. A single <code>app.yaml</code> generates your entire application — API REST, Admin UI, Mobile (Expo), Desktop (Tauri), PWA, GraphQL, webhooks, background jobs, auth with 35 OAuth providers, audit logs, feature flags, and more.</p>

        <h2>Philosophy</h2>
        <p><strong>One source of truth.</strong> Your models, auth, permissions, and plugins are defined in one file. No separate route files, no migration scripts, no duplicated configuration.</p>
        <p><strong>Batteries included.</strong> 35 OAuth providers, ABAC policy engine, real-time WebSocket, background jobs, email, storage, cache, payments — all built-in. Zero external dependencies for features you don't use.</p>
        <p><strong>Multi-target by default.</strong> The same YAML generates API endpoints, an admin dashboard, React Native mobile apps (Expo), and Tauri desktop apps.</p>

        <h2>Architecture</h2>
        <p>Zorux is built on <strong>Bun</strong> runtime and <strong>Hono</strong> HTTP framework:</p>
        <ol>
          <li>You write <code>app.yaml</code> with your models, auth config, and database settings</li>
          <li>Zorux compiles the YAML into compiled models with fields, relations, policies</li>
          <li>The platform adapter creates database tables (SQLite, PostgreSQL, MySQL, etc.)</li>
          <li>The route generator creates CRUD endpoints, auth routes, admin UI, GraphQL</li>
          <li>Plugins are loaded automatically (npm packages detected via 12 adapters)</li>
          <li>The server starts with REST API + WebSocket + Admin UI</li>
        </ol>

        <h2>One file, everything</h2>
        <p>Define your models, auth, database, and plugins in a single YAML file:</p>
        <pre><span class="kw">name</span>: my-saas
<span class="kw">type</span>: fullstack
<span class="kw">auth</span>:
  <span class="kw">model</span>: user
  <span class="kw">registration</span>: open
<span class="kw">models</span>:
  <span class="kw">user</span>:
    <span class="kw">fields</span>:
      <span class="kw">email</span>: { <span class="kw">type</span>: string, <span class="kw">unique</span>: true }
      <span class="kw">name</span>: { <span class="kw">type</span>: string, <span class="kw">required</span>: true }
    <span class="kw">auth</span>: email
  <span class="kw">post</span>:
    <span class="kw">fields</span>:
      <span class="kw">title</span>: { <span class="kw">type</span>: string, <span class="kw">required</span>: true }
      <span class="kw">author</span>: user
      <span class="kw">published</span>: { <span class="kw">type</span>: boolean }
    <span class="kw">policies</span>:
      <span class="kw">create</span>: <span class="st">"authenticated"</span>
      <span class="kw">read</span>: <span class="st">"*"</span></pre>

        <h2>Key concepts</h2>
        <h3>Models</h3>
        <p>Each model generates a database table, CRUD API routes, and admin UI pages. Models have fields, relations, policies, and more.</p>

        <h3>Policies</h3>
        <p>Zorux includes a powerful ABAC engine. Policies are defined per-model in app.yaml:</p>
        <pre><span class="kw">policies</span>:
  <span class="kw">create</span>: <span class="st">'user.role == "admin"'</span>
  <span class="kw">read</span>: <span class="st">"*"</span>
  <span class="kw">update</span>: <span class="st">'user.role == "admin" || resource.authorId == user.id'</span>
  <span class="kw">delete</span>: <span class="st">'user.role == "admin"'</span></pre>
        <p>Supported operators: <code>==</code>, <code>!=</code>, <code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>, <code>&lt;=</code>, <code>in</code>, <code>matches</code>, <code>exists</code>, <code>&&</code>, <code>||</code>, <code>!</code>, <code>()</code></p>

        <h3>Multi-Output</h3>
        <p>One schema generates: API REST, Admin UI, Mobile (Expo), Desktop (Tauri), PWA. Generate what you need with <code>zorux gen</code>.</p>

        <h2>Next steps</h2>
        <ul>
          <li><a href="/install">Install Zorux</a></li>
          <li><a href="/quickstart">Quick Start guide</a></li>
        </ul>
      </main>
    </div>
  </SiteLayout>
)
