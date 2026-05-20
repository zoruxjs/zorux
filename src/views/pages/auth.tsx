import type { FC } from "hono/jsx"

interface AuthPageProps {
  mode: "login" | "register"
  error?: string
}

export const AuthPage: FC<AuthPageProps> = ({ mode, error }) => {
  const title = mode === "login" ? "Sign in" : "Create account"
  const subtitle = mode === "login" ? "Welcome back" : "Get started with Zorux"
  const action = mode === "login" ? "/login" : "/register"

  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} - Zorux</title>
        <link rel="stylesheet" href="/static/admin.css" />
      </head>
      <body class="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <div class="card bg-base-100 border border-base-300 w-full max-w-sm">
          <div class="card-body p-6">
            <div class="flex items-center gap-2 mb-1">
              <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-content font-bold text-sm">Z</div>
              <span class="font-bold text-sm">Zorux</span>
            </div>
            <h2 class="card-title text-xl mt-2">{title}</h2>
            <p class="text-sm opacity-60 mb-2">{subtitle}</p>

            {error && (
              <div role="alert" class="alert alert-error text-sm py-2 mb-2">
                <span>{error}</span>
              </div>
            )}

            <form method="POST" action={action}>
              <fieldset class="fieldset">
                <legend class="fieldset-legend text-sm font-medium">Email</legend>
                <input id="email" name="email" type="email" class="input w-full" placeholder="me@example.com" required />
              </fieldset>
              <fieldset class="fieldset mt-2">
                <legend class="fieldset-legend text-sm font-medium">Password</legend>
                <input id="password" name="password" type="password" class="input w-full" placeholder="••••••••" required />
              </fieldset>
              {mode === "register" && (
                <fieldset class="fieldset mt-2">
                  <legend class="fieldset-legend text-sm font-medium">Name</legend>
                  <input id="name" name="name" type="text" class="input w-full" placeholder="Your name" required />
                </fieldset>
              )}
              <button class="btn btn-primary w-full mt-4">{mode === "login" ? "Sign in" : "Create account"}</button>
            </form>

            <p class="text-center text-sm mt-4 opacity-60">
              {mode === "login" ? (
                <>No account? <a href="/register" class="link link-primary">Register</a></>
              ) : (
                <>Already have an account? <a href="/login" class="link link-primary">Sign in</a></>
              )}
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
