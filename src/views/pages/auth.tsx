import type { FC } from "hono/jsx"
import { Flash } from "../components/UI"

interface AuthPageProps {
  mode: "login" | "register"
  error?: string
}

export const AuthPage: FC<AuthPageProps> = ({ mode, error }) => {
  const title = mode === "login" ? "Sign in" : "Create account"
  const subtitle = mode === "login" ? "Welcome back" : "Get started with Zorux"
  const action = mode === "login" ? "/login" : "/register"

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} - Zorux</title>
        <link rel="stylesheet" href="/static/Zorux.css" />
      </head>
      <body class="auth-page">
        <div class="auth-card">
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {error && <Flash type="error" message={error} />}
          <form method="POST" action={action}>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" required />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" required />
            </div>
            {mode === "register" && (
              <div class="form-group">
                <label for="name">Name</label>
                <input id="name" name="name" type="text" required />
              </div>
            )}
            <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:0.5rem">
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p style="text-align:center;margin-top:1rem;font-size:0.875rem">
            {mode === "login" ? (
              <>No account? <a href="/register">Register</a></>
            ) : (
              <>Already have an account? <a href="/login">Sign in</a></>
            )}
          </p>
        </div>
      </body>
    </html>
  )
}
