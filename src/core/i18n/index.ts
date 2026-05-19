import { readdirSync, existsSync, readFileSync } from "fs"
import { join } from "path"

const translations = new Map<string, Record<string, string>>()
let loadedLocales: string[] = []
let defaultLocale = "en"

// ── Default English translations (built-in) ──

const defaultTranslations: Record<string, Record<string, string>> = {
  en: {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.search": "Search...",
    "common.clear": "Clear",
    "common.loading": "Loading...",
    "common.noRecords": "No records",
    "common.confirmDelete": "Are you sure?",

    "auth.login": "Login",
    "auth.logout": "Logout",
    "auth.register": "Register",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Name",
    "auth.invalidCredentials": "Invalid credentials",

    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Overview of your data",
    "dashboard.quickActions": "Quick Actions",
    "dashboard.recentActivity": "Recent Activity",
    "dashboard.records": "Records",

    "admin.new": "New {name}",
    "admin.edit": "Edit {name}",
    "admin.actions": "Actions",
    "admin.search": "Search...",

    "emailSandbox.title": "Email Sandbox",
    "emailSandbox.subtitle": "Fake email provider — no real emails are sent",
    "emailSandbox.noEmails": "No emails captured yet.",
    "emailSandbox.captured": "{count} emails captured",
    "emailSandbox.clearAll": "Clear All",

    "pagination.prev": "← Prev",
    "pagination.next": "Next →",
    "pagination.page": "Page {page} of {total}",

    "errors.notFound": "Not found",
    "errors.unauthorized": "Unauthorized",
    "errors.forbidden": "Forbidden",
    "errors.validationFailed": "Validation failed",
  },
}

// ── Initialization ──

export function initI18n(rootDir: string, config?: { defaultLocale?: string; locales?: string[] }) {
  defaultLocale = config?.defaultLocale || "en"
  const configLocales = config?.locales || ["en"]

  // Load default translations
  for (const [locale, strings] of Object.entries(defaultTranslations)) {
    const existing = translations.get(locale) || {}
    translations.set(locale, { ...existing, ...strings })
  }
  loadedLocales = [...new Set([...loadedLocales, ...configLocales.filter(l => translations.has(l))])]

  // Load from locales/ directory
  const localesDir = join(rootDir, "locales")
  if (existsSync(localesDir)) {
    const files = readdirSync(localesDir).filter(f => f.endsWith(".json"))
    for (const file of files) {
      const locale = file.replace(".json", "")
      try {
        const content = JSON.parse(readFileSync(join(localesDir, file), "utf-8"))
        const existing = translations.get(locale) || {}
        translations.set(locale, { ...existing, ...content })
        if (!loadedLocales.includes(locale)) loadedLocales.push(locale)
      } catch (err: any) {
        console.error("  [i18n] Failed to load locale: " + file + " - " + err.message)
      }
    }
  }

  if (!loadedLocales.includes(defaultLocale) && translations.has(defaultLocale)) {
    loadedLocales.unshift(defaultLocale)
  }
}

// ── Translation function ──

export function t(key: string, vars?: Record<string, string | number>, locale?: string): string {
  const lang = locale || defaultLocale
  const strings = translations.get(lang) || translations.get(defaultLocale) || {}

  let value = strings[key]
  if (value === undefined) {
    // Fallback to key itself
    value = key
  }

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp("\\{" + k + "\\}", "g"), String(v))
    }
  }

  return value
}

// ── Language detection middleware ──

export function i18nMiddleware(c: any, next: any) {
  const cookieLang = c.req.header("Cookie")
    ?.split(";")
    .map((s: string) => s.trim())
    .find((s: string) => s.startsWith("lang="))
    ?.split("=")[1]

  const acceptLang = c.req.header("Accept-Language")
    ?.split(",")[0]
    ?.split("-")[0]

  const lang = cookieLang || acceptLang || defaultLocale
  const resolved = loadedLocales.includes(lang) ? lang : defaultLocale
  c.set("locale", resolved)
  c.header("Content-Language", resolved)

  return next()
}

// ── Helpers ──

export function getLocale(c: any): string {
  return c.get("locale") || defaultLocale
}

export function getLoadedLocales(): string[] {
  return [...loadedLocales]
}
