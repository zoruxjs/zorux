# Email

Zorux has a built-in email system with multiple providers.

## Configuration

```yaml
email:
  provider: fake           # fake | log | resend | sendgrid | smtp
  from: noreply@example.com
  resend:
    apiKey: re_xxx
  sendgrid:
    apiKey: SG.xxx
```

Or via env vars: `RESEND_API_KEY`, `SENDGRID_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

## Providers

| Provider | Package | Env Var |
|----------|---------|---------|
| `fake` (default) | None | Captures in memory, view at `/admin/emails` |
| `log` | None | Prints to console |
| `resend` | `npm install resend` | `RESEND_API_KEY` |
| `sendgrid` | `npm install @sendgrid/mail` | `SENDGRID_API_KEY` |
| `smtp` | `npm install nodemailer` | `SMTP_HOST`, `SMTP_PORT`, etc |

## Usage

```ts
import { sendEmail } from "Zorux/email"

await sendEmail({
  to: "user@test.com",
  subject: "Welcome!",
  html: "<h1>Hi there!</h1>",
  text: "Hi there!",
})
```

### In Actions

```ts
// actions/notify.ts
import { sendEmail } from "Zorux/email"

export const notify = {
  policy: "admin",
  handler: async (c) => {
    const { email, message } = await c.req.json()
    await sendEmail({ to: email, subject: "Notification", text: message })
    return c.json({ success: true })
  },
}
```

### In Jobs

```ts
// jobs/send-welcome.ts
import { sendEmail } from "Zorux/email"

export default {
  name: "send-welcome",
  async perform(args: { email: string; name: string }) {
    await sendEmail({
      to: args.email,
      subject: "Welcome " + args.name,
      html: `<h1>Welcome ${args.name}!</h1>`,
    })
  },
}
```

## Email Sandbox

With `provider: fake`, all emails are stored in memory and visible at `/admin/emails` with HTML preview, read status, and delete capability. No external service needed.
