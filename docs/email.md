# Email

Zorux supports 5 email providers with a unified `sendEmail()` API, in-memory sandbox, and admin email viewer.

## Configuration

```yaml
email:
  provider: fake                # fake | log | resend | sendgrid | smtp
  from: "noreply@myapp.com"     # Default from address
  resend:
    apiKey: string
  sendgrid:
    apiKey: string
  smtp:
    host: string
    port: number
    secure: boolean
    user: string
    pass: string
```

## Providers

### Fake (Default)

In-memory email sandbox. Emails are stored in memory and viewable in the admin UI.

```yaml
email:
  provider: fake
```

**Best for:** Development and testing.

**Admin UI:** `/admin/emails` — View, preview, and manage captured emails.

### Log

Logs emails to console.

```yaml
email:
  provider: log
```

**Best for:** Debugging.

### Resend

```yaml
email:
  provider: resend
  from: "noreply@myapp.com"
  resend:
    apiKey: "${RESEND_API_KEY}"
```

**Environment Variable:** `RESEND_API_KEY`

**Package:** `resend` (npm) — lazy loaded

### SendGrid

```yaml
email:
  provider: sendgrid
  from: "noreply@myapp.com"
  sendgrid:
    apiKey: "${SENDGRID_API_KEY}"
```

**Environment Variable:** `SENDGRID_API_KEY`

**Package:** `@sendgrid/mail` (npm) — lazy loaded

### SMTP

```yaml
email:
  provider: smtp
  from: "noreply@myapp.com"
  smtp:
    host: "smtp.gmail.com"
    port: 587
    secure: false
    user: "myemail@gmail.com"
    pass: "apppassword"
```

**Environment Variables:**

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_SECURE` | Use TLS (default: false) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

**Package:** `nodemailer` (npm) — lazy loaded

## sendEmail() API

```typescript
interface EmailOptions {
  to: string | string[]         // Recipient(s)
  subject: string               // Email subject
  text?: string                 // Plain text body
  html?: string                 // HTML body
  from?: string                 // Override default from
}

async function sendEmail(options: EmailOptions): Promise<void>
```

### Examples

```typescript
// Simple text email
await sendEmail({
  to: "user@example.com",
  subject: "Welcome!",
  text: "Thanks for signing up."
})

// HTML email
await sendEmail({
  to: "user@example.com",
  subject: "Your Order",
  html: `<h1>Order Confirmed</h1><p>Thank you!</p>`
})

// Multiple recipients
await sendEmail({
  to: ["admin@example.com", "support@example.com"],
  subject: "New Signup",
  text: "A new user has registered."
})

// Custom from
await sendEmail({
  to: "user@example.com",
  from: "team@myapp.com",
  subject: "Hello",
  html: `<p>Hi there!</p>`
})
```

## Email Templates

Emails can be sent with HTML templates:

```typescript
await sendEmail({
  to: user.email,
  subject: "Password Reset",
  html: `
    <h1>Password Reset</h1>
    <p>Click the link below to reset your password:</p>
    <a href="https://myapp.com/reset?token=${token}">Reset Password</a>
    <p>This link expires in 1 hour.</p>
  `
})
```

## Email Sandbox

When using the `fake` provider, emails are captured and viewable at `/admin/emails`.

### Features

- **List view** — Subject, to, date for each email
- **Detail view** — Full email content
- **HTML preview** — Renders HTML emails inline
- **Text view** — Plain text alternative
- **Clear all** — Delete all captured emails
- **Delete individual** — Remove specific emails

## Built-in Email Flows

Zorux automatically sends emails for:

| Flow | Trigger | Content |
|---|---|---|
| Password Reset | `POST /api/auth/forgot-password` | Reset link with token |
| Email Verification | `POST /api/auth/send-verification` | Verification link |
| Magic Link | `POST /api/auth/magic-link/send` | Login link |
| Email OTP | `POST /api/auth/otp/send` | 6-digit code |
| Org Invite | `POST /api/auth/orgs/:id/invite` | Invite link |

## Custom Email Flows

In actions or jobs:

```typescript
// actions/notifications.ts
export const welcome = F.public(async (ctx) => {
  const { email, name } = ctx.req.json()

  await sendEmail({
    to: email,
    subject: "Welcome to My App!",
    html: `<h1>Welcome, ${name}!</h1><p>Thanks for joining.</p>`
  })

  return F.json({ sent: true })
})
```

```typescript
// jobs/send-welcome.ts
export default {
  name: "send-welcome",
  async perform(args: { email: string; name: string }) {
    await sendEmail({
      to: args.email,
      subject: "Welcome!",
      html: `<h1>Hi ${args.name}!</h1>`
    })
  }
}
```
