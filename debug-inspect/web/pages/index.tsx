import type { FC } from "hono/jsx"

export const HomePage: FC<{ appName: string }> = ({ appName }) => (
  <div class="min-h-screen bg-base-200">
    <nav class="navbar bg-base-100/80 backdrop-blur border-b border-base-200 sticky top-0 z-20 px-6">
      <div class="flex-1 font-bold text-lg tracking-tight">{appName}</div>
      <div class="flex gap-2">
        <a href="/login" class="btn btn-soft btn-sm">Sign in</a>
        <a href="/register" class="btn btn-primary btn-sm">Get started</a>
      </div>
    </nav>
    <main>
      <section class="hero bg-base-100 py-24 px-6">
        <div class="hero-content text-center max-w-2xl mx-auto">
          <div>
            <div class="badge badge-soft badge-primary mb-4">Built with Zorux</div>
            <h1 class="text-5xl font-bold tracking-tight">{appName}</h1>
            <p class="text-lg opacity-60 mt-4 max-w-lg mx-auto">Full-stack SaaS powered by Zorux. One YAML file generates API, admin, auth, payments, and teams.</p>
            <a href="/register" class="btn btn-primary btn-lg mt-6">Get started →</a>
          </div>
        </div>
      </section>
      <section class="py-16 px-6 max-w-5xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card card-border bg-base-100">
            <div class="card-body">
              <h3 class="card-title">Team Management</h3>
              <p class="text-sm opacity-60">Invite members, assign roles, manage permissions across organizations.</p>
            </div>
          </div>
          <div class="card card-border bg-base-100">
            <div class="card-body">
              <h3 class="card-title">Subscriptions</h3>
              <p class="text-sm opacity-60">Stripe integration with plans, billing, and customer portal.</p>
            </div>
          </div>
          <div class="card card-border bg-base-100">
            <div class="card-body">
              <h3 class="card-title">API First</h3>
              <p class="text-sm opacity-60">REST API with Swagger docs, auto-generated from your models.</p>
            </div>
          </div>
        </div>
      </section>
      <footer class="text-center py-8 text-sm opacity-40 border-t border-base-200">
        <p>&copy; 2026 {appName}. Built with Zorux.</p>
      </footer>
    </main>
  </div>
)
