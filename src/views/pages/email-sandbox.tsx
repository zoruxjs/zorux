import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"
import type { StoredEmail } from "../../core/email"

export const EmailSandboxList: FC<{ emails: StoredEmail[]; models?: any[] }> = ({ emails, models }) => (
  <Layout title="Email Sandbox - Admin" models={models}>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="section-title">Email Sandbox</h2>
        <p class="section-desc">{emails.length} captured · Fake provider, no real emails sent</p>
      </div>
      {emails.length > 0 && (
        <form method="POST" action="/admin/emails/clear" style="display:inline">
          <button class="btn btn-soft btn-error btn-sm">Clear All</button>
        </form>
      )}
    </div>

    <div class="card" style="background:var(--b1);border:1px solid color-mix(in oklch, var(--bc) 8%, transparent);border-radius:var(--radius-box);padding:1rem">
      {emails.length === 0 ? (
        <div style="text-align:center;padding:3rem 1rem;opacity:0.4">
          <div style="font-size:2rem;margin-bottom:0.75rem">📬</div>
          <h3 style="font-weight:600;margin-bottom:0.25rem">No emails captured</h3>
          <p style="font-size:0.85rem">Use <code>sendEmail()</code> in an action or job</p>
        </div>
      ) : (
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr><th class="text-xs opacity-50 uppercase tracking-wider">#</th><th class="text-xs opacity-50 uppercase tracking-wider">To</th><th class="text-xs opacity-50 uppercase tracking-wider">Subject</th><th class="text-xs opacity-50 uppercase tracking-wider">Time</th><th class="text-xs opacity-50 uppercase tracking-wider">Status</th><th></th></tr>
            </thead>
            <tbody>
              {[...emails].reverse().map(e => (
                <tr>
                  <td class="text-sm font-mono opacity-60">{e.id}</td>
                  <td class="text-sm">{Array.isArray(e.to) ? e.to.join(", ") : e.to}</td>
                  <td class="text-sm">{e.subject}</td>
                  <td class="text-sm opacity-40">{new Date(e.sentAt).toLocaleTimeString()}</td>
                  <td>{e.read ? <span class="badge badge-soft badge-success badge-xs">read</span> : <span class="badge badge-soft badge-info badge-xs">new</span>}</td>
                  <td><a href={"/admin/emails/" + e.id} class="btn btn-soft btn-primary btn-xs">View</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </Layout>
)

export const EmailSandboxDetail: FC<{ email: StoredEmail; models?: any[] }> = ({ email, models }) => (
  <Layout title={"Email #" + email.id + " - Sandbox"} models={models}>
    <div class="mb-4">
      <a href="/admin/emails" class="text-sm opacity-50" style="text-decoration:none">← Back to inbox</a>
      <h2 class="section-title">Email #{email.id}</h2>
    </div>
    <div class="card" style="background:var(--b1);border:1px solid color-mix(in oklch, var(--bc) 8%, transparent);border-radius:var(--radius-box);padding:1.25rem">
      <dl class="email-meta">
        <dt>From</dt><dd>{email.from}</dd>
        <dt>To</dt><dd>{Array.isArray(email.to) ? email.to.join(", ") : email.to}</dd>
        <dt>Subject</dt><dd>{email.subject}</dd>
        <dt>Sent at</dt><dd>{new Date(email.sentAt).toLocaleString()}</dd>
      </dl>

      {email.html ? (
        <div style="margin-top:1rem;border:1px solid color-mix(in oklch, var(--bc) 8%, transparent);border-radius:var(--radius-field);overflow:hidden">
          <div style="padding:0.4rem 0.75rem;font-size:0.78rem;opacity:0.4;background:var(--b2);display:flex;justify-content:space-between;align-items:center">
            <span>HTML Preview</span>
          </div>
          <iframe src={"/admin/emails/" + email.id + "/preview"} class="email-iframe" title="Email preview" />
        </div>
      ) : null}

      {email.text ? (
        <div style="margin-top:1rem">
          <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.5rem">Text body</div>
          <pre class="email-text">{email.text}</pre>
        </div>
      ) : null}
    </div>
    <div class="flex gap-2 mt-4">
      <form method="POST" action={"/admin/emails/" + email.id + "/delete"} style="display:inline">
        <button class="btn btn-soft btn-error btn-sm">Delete</button>
      </form>
    </div>
  </Layout>
)
