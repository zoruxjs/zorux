import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"
import type { StoredEmail } from "../../core/email"

export const EmailSandboxList: FC<{ emails: StoredEmail[]; models?: any[] }> = ({ emails, models }) => (
  <Layout title="Email Sandbox - Admin" models={models}>
    <div style="margin-bottom:1rem">
      <div class="flex flex-gap" style="align-items:center;justify-content:space-between">
        <h1 style="margin:0">Email Sandbox</h1>
        <div class="flex flex-gap">
          <span class="text-muted">{emails.length} emails captured</span>
          {emails.length > 0 && (
            <form method="POST" action="/admin/emails/clear" style="display:inline">
              <button class="btn btn-danger btn-sm">Clear All</button>
            </form>
          )}
        </div>
      </div>
      <p class="text-muted" style="margin:0.25rem 0 0">Fake email provider — no real emails are sent</p>
    </div>

    <div class="card">
      {emails.length === 0 ? (
        <div style="padding:2rem;text-align:center;color:var(--muted,#666)">
          <p>No emails captured yet.</p>
          <p class="text-sm">Send an email via <code>sendEmail()</code> in an action or job to see it here.</p>
        </div>
      ) : (
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>To</th>
                <th>Subject</th>
                <th>Time</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...emails].reverse().map(e => (
                <tr>
                  <td>{e.id}</td>
                  <td>{Array.isArray(e.to) ? e.to.join(", ") : e.to}</td>
                  <td>{e.subject}</td>
                  <td class="text-muted" style="font-size:0.85rem">{new Date(e.sentAt).toLocaleTimeString()}</td>
                  <td>{e.read ? <span class="badge badge-success">read</span> : <span class="badge">new</span>}</td>
                  <td><a href={"/admin/emails/" + e.id} class="btn btn-sm btn-primary">View</a></td>
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
    <div style="margin-bottom:1rem">
      <a href="/admin/emails" class="text-muted" style="text-decoration:none">← Back to inbox</a>
      <h1 style="margin:0.5rem 0">Email #{email.id}</h1>
    </div>

    <div class="card">
      <div style="padding:1rem">
        <div style="margin-bottom:0.75rem">
          <strong>From:</strong> {email.from}
        </div>
        <div style="margin-bottom:0.75rem">
          <strong>To:</strong> {Array.isArray(email.to) ? email.to.join(", ") : email.to}
        </div>
        <div style="margin-bottom:0.75rem">
          <strong>Subject:</strong> {email.subject}
        </div>
        <div style="margin-bottom:0.75rem">
          <strong>Sent at:</strong> {new Date(email.sentAt).toLocaleString()}
        </div>

        <hr style="margin:1rem 0;border:none;border-top:1px solid var(--border,#eee)" />

        {email.html ? (
          <div style="border:1px solid var(--border,#eee);border-radius:4px;overflow:hidden">
            <div style="background:var(--bg-alt,#f5f5f5);padding:0.5rem 1rem;font-size:0.85rem;color:var(--muted,#666)">
              HTML Preview
            </div>
            <iframe src={"/admin/emails/" + email.id + "/preview"} style="width:100%;height:400px;border:none" title="Email preview" />
          </div>
        ) : null}

        {email.text ? (
          <div style="margin-top:1rem">
            <strong>Text body:</strong>
            <pre style="background:var(--bg-alt,#f5f5f5);padding:1rem;border-radius:4px;overflow-x:auto;white-space:pre-wrap">{email.text}</pre>
          </div>
        ) : null}
      </div>
    </div>

    <div class="flex flex-gap" style="margin-top:1rem">
      <form method="POST" action={"/admin/emails/" + email.id + "/delete"} style="display:inline">
        <button class="btn btn-danger btn-sm">Delete</button>
      </form>
    </div>
  </Layout>
)
