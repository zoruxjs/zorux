import type { FC } from "hono/jsx"
import { SiteLayout, DocSidebar } from "../components/SiteLayout"

export const InstallPage: FC = () => (
  <SiteLayout title="Install">
    <div class="docs">
      <DocSidebar active="installation" />
      <main class="docs-main">
        <h1>Installation</h1>

        <h2>Prerequisites</h2>
        <ul>
          <li><strong>Bun</strong> v1.2+ (recommended) — <code>curl -fsSL https://bun.sh/install | bash</code></li>
          <li><strong>Node.js</strong> v18+ (alternative runtime)</li>
        </ul>

        <h2>Install via npm</h2>
        <pre><span class="kw">npm install -g zorux</span></pre>

        <h2>Verify</h2>
        <pre>zorux --version
<span class="cm">Zorux v0.1.7
Runtime: Bun 1.2.x
Platform: win32 (x64)</span></pre>

        <h2>Create your first project</h2>
        <pre><span class="kw">zorux new</span> my-app --saas
<span class="kw">cd</span> my-app
<span class="kw">zorux dev</span></pre>
        <p>Open <a href="http://localhost:3000">http://localhost:3000</a> — API at <code>/api</code>, admin at <code>/admin</code>.</p>

        <h2>Project structure</h2>
        <pre>my-app/
├── app.yaml        <span class="cm"># Your app configuration</span>
├── actions/        <span class="cm"># Custom action handlers</span>
├── jobs/           <span class="cm"># Background jobs</span>
├── plugins/        <span class="cm"># Local plugins</span>
├── locales/        <span class="cm"># i18n translations</span>
├── migrations/     <span class="cm"># DB migrations</span>
└── public/         <span class="cm"># Static files</span></pre>

        <h2>Project types</h2>
        <pre>zorux new my-app            <span class="cm"># Web (default)</span>
zorux new my-app --api      <span class="cm"># API only</span>
zorux new my-app --web      <span class="cm"># API + Admin UI</span>
zorux new my-app --mobile   <span class="cm"># API + Mobile (Expo)</span>
zorux new my-app --saas     <span class="cm"># Full SaaS starter</span>
zorux new my-app --all      <span class="cm"># Everything</span></pre>
      </main>
    </div>
  </SiteLayout>
)
