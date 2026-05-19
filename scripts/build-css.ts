import { execSync } from "child_process"
import { join } from "path"
import { existsSync, statSync } from "fs"

const dir = import.meta.dir
const root = join(dir, "..")
const src = join(root, "src/views/static/admin.css")
const dst = join(root, "dist/views/static/admin.css")

if (!existsSync(src)) {
  console.error(`[build-css] Source not found: ${src}`)
  process.exit(1)
}

const cli = join(root, "node_modules/@tailwindcss/cli/dist/index.mjs")
execSync(`node "${cli}" -i "${src}" -o "${dst}"`, {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV || "production" },
})

const size = statSync(dst).size
console.log(`[build-css] Done — ${(size / 1024).toFixed(0)}KB`)
