import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto"

const CREDENTIALS_FILE = "config/credentials.yml.enc"
const KEY_FILE = "config/master.key"

function deriveKey(password: string): Buffer {
  return createHash("sha256").update(password).digest()
}

function encrypt(text: string, key: Buffer): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv("aes-256-cbc", key, iv)
  const encrypted = Buffer.concat([cipher.update(text, "utf-8"), cipher.final()])
  return iv.toString("hex") + ":" + encrypted.toString("hex")
}

function decrypt(data: string, key: Buffer): string {
  const [ivHex, encHex] = data.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const encrypted = Buffer.from(encHex, "hex")
  const decipher = createDecipheriv("aes-256-cbc", key, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8")
}

function getMasterKey(rootDir: string): Buffer {
  const keyPath = join(rootDir, KEY_FILE)
  if (!existsSync(keyPath)) {
    const key = randomBytes(32).toString("hex")
    writeFileSync(keyPath, key)
    console.log("  \u2705 Created " + KEY_FILE + " — keep this safe! Do not commit it.")
    return Buffer.from(key, "hex")
  }
  return Buffer.from(readFileSync(keyPath, "utf-8").trim(), "hex")
}

export function credentialsCommand(args: string[]) {
  const subcmd = args[1]
  const rootDir = process.cwd()
  const credPath = join(rootDir, CREDENTIALS_FILE)
  const dir = join(rootDir, "config")

  // Ensure config/ directory exists before anything else
  if (!existsSync(dir)) {
    const { mkdirSync } = require("fs")
    mkdirSync(dir, { recursive: true })
  }

  const key = getMasterKey(rootDir)

  if (subcmd === "edit") {
    // Decrypt, open in editor, re-encrypt
    let content = ""
    if (existsSync(credPath)) {
      try {
        const enc = readFileSync(credPath, "utf-8").trim()
        content = decrypt(enc, key)
      } catch {
        content = "# Invalid credentials file. Starting fresh.\n"
      }
    } else {
      content = "# Encrypted credentials\n# Add your secrets here:\n# \n# stripe:\n#   secret_key: sk_live_...\n# \n# aws:\n#   access_key_id: AKIA...\n#   secret_access_key: ...\n"
    }

    const tmpPath = join(rootDir, "config", "credentials.tmp.yml")
    writeFileSync(tmpPath, content)

    // Try to open in editor
    const editor = process.env.EDITOR || process.env.VISUAL || "notepad"
    const { spawnSync } = require("child_process")
    const result = spawnSync(editor, [tmpPath], { stdio: "inherit", shell: true })

    if (result.status === 0) {
      const newContent = readFileSync(tmpPath, "utf-8")
      const encrypted = encrypt(newContent, key)
      writeFileSync(credPath, encrypted)
      console.log("  \u2705 Credentials encrypted and saved.")
    } else {
      console.log("  \u2716 Editor closed with error. Changes not saved.")
    }

    // Clean up temp file
    try { require("fs").unlinkSync(tmpPath) } catch {}

  } else if (subcmd === "show") {
    if (!existsSync(credPath)) {
      console.log("  No credentials file found. Run 'fw credentials edit' to create one.")
      return
    }
    try {
      const enc = readFileSync(credPath, "utf-8").trim()
      const content = decrypt(enc, key)
      console.log("\n" + content + "\n")
    } catch {
      console.error("  \u2716 Failed to decrypt credentials. Master key may be wrong.")
    }

  } else if (subcmd === "setup") {
    // Just ensure master key exists
    console.log("  \u2705 Master key ready at " + KEY_FILE)
    if (!existsSync(credPath)) {
      writeFileSync(credPath, encrypt("# Empty credentials\n", key))
      console.log("  \u2705 Credentials file created at " + CREDENTIALS_FILE)
    }

  } else {
    console.log("Usage:")
    console.log("  fw credentials setup          # Initialize master key + credentials")
    console.log("  fw credentials edit            # Open credentials in editor")
    console.log("  fw credentials show            # Display decrypted credentials")
  }
}
