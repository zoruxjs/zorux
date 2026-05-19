import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"
import type { StoredEmail } from "../../core/email"

export const EmailSandboxList: FC<{ emails: StoredEmail[]; models?: any[] }> = ({ emails, models }) => (
  <Layout title="Email Sandbox - Admin" models={models}>
    <div class="flex flex-gap flex-between" style="margin-bottom:1rem">
      <div>
        <h2 style="margin:0;font-size:1.25rem">Email Sandbox</h2>
        <p class="text-muted text-sm" style="margin:0.25rem 0 0">Fake email provider — no real emails are sent</p>
      </div>
      <div class="btn-group">
        <span class="text-sm text-muted" style="align-self:center">{emails.length} captured</span>
        {emails.length > 0 && (
          <form method="POST" action="/admin/emails/clear" style="display:inline">
            <button class="btn btn-danger btn-sm">Clear All</button>
          </form>
        )}
      </div>
    </div>

    <div class="card email-list">
      {emails.length === 0 ? (
        <div class="empty">
          <div class="empty-icon">📬</div>
          <h3>No emails captured</h3>
          <p>Send an email via <code>sendEmail()</code> in an action or job to see it here.</p>
        </div>
      ) : (
        <div class="table-wrap">
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
                  <td class="text-muted text-sm">{new Date(e.sentAt).toLocaleTimeString()}</td>
                  <td>{e.read ? <span class="badge badge-success">read</span> : <span class="badge badge-info">new</span>}</td>
                  <td><a href={"/admin/emails/" + e.id} class="btn btn-primary btn-sm">View</a></td>
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
      <a href="/admin/emails" class="text-muted text-sm" style="text-decoration:none">← Back to inbox</a>
      <h2 style="margin:0.5rem 0 0;font-size:1.25rem">Email #{email.id}</h2>
    </div>

    <div class="card">
      <dl class="email-detail-grid">
        <dt>From</dt><dd>{email.from}</dd>
        <dt>To</dt><dd>{Array.isArray(email.to) ? email.to.join(", ") : email.to}</dd>
        <dt>Subject</dt><dd>{email.subject}</dd>
        <dt>Sent at</dt><dd>{new Date(email.sentAt).toLocaleString()}</dd>
      </dl>

      {email.html ? (
        <div class="email-preview-box" style="margin-top:1rem">
          <div class="email-preview-header">
            <span>HTML Preview</span>
          </div>
          <iframe src={"/admin/emails/" + email.id + "/preview"} class="email-preview-iframe" title="Email preview" />
        </div>
      ) : null}

      {email.text ? (
        <div style="margin-top:1rem">
          <strong class="text-sm">Text body:</strong>
          <pre class="email-text-body">{email.text}</pre>
        </div>
      ) : null}
    </div>

    <div class="btn-group" style="margin-top:1rem">
      <form method="POST" action={"/admin/emails/" + email.id + "/delete"} style="display:inline">
        <button class="btn btn-danger btn-sm">Delete</button>
      </form>
    </div>
  </Layout>
)
