export interface EmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  from?: string
}

export interface StoredEmail extends EmailOptions {
  id: number
  sentAt: string
  read: boolean
}

export interface EmailProvider {
  name: string
  send(options: EmailOptions): Promise<void>
}

// --- Fake Provider (sandbox embutido) ---

const storedEmails: StoredEmail[] = []
let emailIdCounter = 0

class FakeEmailProvider implements EmailProvider {
  name = "fake"

  async send(options: EmailOptions): Promise<void> {
    emailIdCounter++
    const email: StoredEmail = {
      id: emailIdCounter,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      from: options.from || process.env.EMAIL_FROM || "noreply@example.com",
      sentAt: new Date().toISOString(),
      read: false,
    }
    storedEmails.push(email)
    console.log("  [email] Captured: #" + email.id + " -> " + email.to + " | " + email.subject)
  }
}

export function getStoredEmails(): StoredEmail[] {
  return [...storedEmails]
}

export function getStoredEmail(id: number): StoredEmail | undefined {
  const email = storedEmails.find(e => e.id === id)
  if (email) email.read = true
  return email
}

export function deleteStoredEmail(id: number): boolean {
  const idx = storedEmails.findIndex(e => e.id === id)
  if (idx >= 0) { storedEmails.splice(idx, 1); return true }
  return false
}

export function clearStoredEmails(): void {
  storedEmails.length = 0
}

// --- Log Provider (dev only) ---

class LogEmailProvider implements EmailProvider {
  name = "log"
  async send(options: EmailOptions): Promise<void> {
    console.log("\n  [email] To:", options.to)
    console.log("  [email] Subject:", options.subject)
    if (options.text) console.log("  [email] Body:", options.text.slice(0, 200))
    if (options.html) console.log("  [email] HTML:", options.html.slice(0, 100) + "...")
    console.log("")
  }
}

// --- Resend ---

class ResendEmailProvider implements EmailProvider {
  name = "resend"
  private client: any

  constructor(apiKey: string) {
    const { Resend } = require("resend")
    this.client = new Resend(apiKey)
  }

  async send(options: EmailOptions): Promise<void> {
    await this.client.emails.send({
      from: options.from || process.env.EMAIL_FROM || "noreply@example.com",
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
    })
  }
}

// --- SendGrid ---

class SendGridEmailProvider implements EmailProvider {
  name = "sendgrid"
  private client: any

  constructor(apiKey: string) {
    const sg = require("@sendgrid/mail")
    sg.setApiKey(apiKey)
    this.client = sg
  }

  async send(options: EmailOptions): Promise<void> {
    await this.client.send({
      from: options.from || process.env.EMAIL_FROM || "noreply@example.com",
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
    })
  }
}

// --- SMTP (nodemailer) ---

class SMTPEmailProvider implements EmailProvider {
  name = "smtp"
  private transport: any

  constructor() {
    const nodemailer = require("nodemailer")
    this.transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || "",
      } : undefined,
    })
  }

  async send(options: EmailOptions): Promise<void> {
    await this.transport.sendMail({
      from: options.from || process.env.EMAIL_FROM || "noreply@example.com",
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })
  }
}

// --- Factory ---

let currentProvider: EmailProvider = new FakeEmailProvider()

export function createEmailProvider(config?: { provider?: string; from?: string; apiKey?: string }): EmailProvider {
  const provider = config?.provider || process.env.EMAIL_PROVIDER || "fake"

  switch (provider) {
    case "resend": {
      const apiKey = config?.apiKey || process.env.RESEND_API_KEY || ""
      if (!apiKey) throw new Error("Resend requires RESEND_API_KEY env var or email.resend.apiKey in YAML")
      currentProvider = new ResendEmailProvider(apiKey)
      return currentProvider
    }
    case "sendgrid": {
      const apiKey = config?.apiKey || process.env.SENDGRID_API_KEY || ""
      if (!apiKey) throw new Error("SendGrid requires SENDGRID_API_KEY env var or email.sendgrid.apiKey in YAML")
      currentProvider = new SendGridEmailProvider(apiKey)
      return currentProvider
    }
    case "smtp":
      currentProvider = new SMTPEmailProvider()
      return currentProvider
    case "log":
      currentProvider = new LogEmailProvider()
      return currentProvider
    default:
      currentProvider = new FakeEmailProvider()
      return currentProvider
  }
}

export function getEmailProvider(): EmailProvider {
  return currentProvider
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  return currentProvider.send(options)
}
