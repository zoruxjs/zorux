import type { FC } from "hono/jsx"
import { Layout } from "../components/Layout"
import type { StoredEmail } from "../../core/email"

export const EmailSandboxList: FC<{ emails: StoredEmail[]; models?: any[]; active?: string }> = ({ emails, models, active }) => (
  <Layout title="Email Sandbox" models={models} active={active}>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-bold tracking-tight">Email Sandbox</h2>
        <p class="text-sm opacity-40 mt-0.5">{emails.length} captured · Fake provider</p>
      </div>
      {emails.length > 0 && (
        <form method="POST" action="/admin/emails/clear" style="display:inline">
          <button class="btn btn-soft btn-error btn-sm">Clear All</button>
        </form>
      )}
    </div>

    <div class="card bg-base-100 border border-base-300">
      <div class="card-body p-4">
        {emails.length === 0 ? (
          <div class="flex flex-col items-center justify-center py-12 opacity-40">
            <div class="text-4xl mb-3">📬</div>
            <p class="font-medium">No emails captured</p>
            <p class="text-sm mt-1">Send an email via <code>sendEmail()</code> in an action or job</p>
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th class="text-xs opacity-50 uppercase tracking-wider">#</th>
                  <th class="text-xs opacity-50 uppercase tracking-wider">To</th>
                  <th class="text-xs opacity-50 uppercase tracking-wider">Subject</th>
                  <th class="text-xs opacity-50 uppercase tracking-wider">Time</th>
                  <th class="text-xs opacity-50 uppercase tracking-wider">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...emails].reverse().map(e => (
                  <tr class="hover:bg-base-200 transition-colors">
                    <td class="font-mono text-xs opacity-40">{e.id}</td>
                    <td class="text-sm">{Array.isArray(e.to) ? e.to.join(", ") : e.to}</td>
                    <td class="text-sm font-medium">{e.subject}</td>
                    <td class="text-xs opacity-40">{new Date(e.sentAt).toLocaleString()}</td>
                    <td>{e.read ? <span class="badge badge-soft badge-success badge-xs">read</span> : <span class="badge badge-soft badge-info badge-xs">new</span>}</td>
                    <td><a href={"/admin/emails/" + e.id} class="btn btn-soft btn-primary btn-xs">View</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </Layout>
)

export const EmailSandboxDetail: FC<{ email: StoredEmail; models?: any[]; active?: string }> = ({ email, models, active }) => (
  <Layout title={"Email #" + email.id} models={models} active={active}>
    <div class="mb-4">
      <a href="/admin/emails" class="text-sm opacity-40 no-underline hover:opacity-80 flex items-center gap-1">← Back to inbox</a>
      <h2 class="text-xl font-bold tracking-tight mt-1">Email #{email.id}</h2>
    </div>

    <div class="card bg-base-100 border border-base-300">
      <div class="card-body p-5">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt class="font-medium opacity-50">From</dt><dd>{email.from}</dd>
          <dt class="font-medium opacity-50">To</dt><dd>{Array.isArray(email.to) ? email.to.join(", ") : email.to}</dd>
          <dt class="font-medium opacity-50">Subject</dt><dd class="font-medium">{email.subject}</dd>
          <dt class="font-medium opacity-50">Sent at</dt><dd>{new Date(email.sentAt).toLocaleString()}</dd>
        </dl>

        {email.html ? (
          <div class="mt-4 border border-base-300 rounded-box overflow-hidden">
            <div class="flex items-center justify-between px-3 py-1.5 bg-base-200 text-xs opacity-60">
              <span>HTML Preview</span>
            </div>
            <iframe src={"/admin/emails/" + email.id + "/preview"} class="w-full h-96 border-none" title="Email preview" />
          </div>
        ) : null}

        {email.text ? (
          <div class="mt-4">
            <div class="text-sm font-medium mb-1">Text body</div>
            <pre class="bg-base-200 p-3 rounded-box text-sm font-mono whitespace-pre-wrap overflow-x-auto">{email.text}</pre>
          </div>
        ) : null}
      </div>
    </div>

    <div class="flex gap-2 mt-4">
      <form method="POST" action={"/admin/emails/" + email.id + "/delete"} style="display:inline">
        <button class="btn btn-soft btn-error btn-sm">Delete</button>
      </form>
    </div>
  </Layout>
)
