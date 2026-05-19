export interface CaptchaProvider {
  name: string
  verifyToken(token: string, ip?: string): Promise<boolean>
}

// ═══════════════════════════════════════════════════
// Cloudflare Turnstile
// ═══════════════════════════════════════════════════

class TurnstileCaptcha implements CaptchaProvider {
  name = "turnstile"
  private secretKey: string

  constructor(secretKey: string) {
    this.secretKey = secretKey
  }

  async verifyToken(token: string, ip?: string): Promise<boolean> {
    const body = new URLSearchParams({
      secret: this.secretKey,
      response: token,
    })
    if (ip) body.set("remoteip", ip)

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    })
    const data = await res.json()
    return data.success === true
  }
}

// ═══════════════════════════════════════════════════
// Google reCAPTCHA v2/v3
// ═══════════════════════════════════════════════════

class RecaptchaCaptcha implements CaptchaProvider {
  name = "recaptcha"
  private secretKey: string

  constructor(secretKey: string) {
    this.secretKey = secretKey
  }

  async verifyToken(token: string, ip?: string): Promise<boolean> {
    const body = new URLSearchParams({
      secret: this.secretKey,
      response: token,
    })
    if (ip) body.set("remoteip", ip)

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      body,
    })
    const data = await res.json()
    return data.success === true
  }
}

// ═══════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════

let currentProvider: CaptchaProvider | null = null

export function createCaptcha(config?: { provider?: string; secretKey?: string }): CaptchaProvider {
  const provider = config?.provider || process.env.CAPTCHA_PROVIDER || ""

  switch (provider) {
    case "turnstile":
    case "cloudflare": {
      const key = config?.secretKey || process.env.TURNSTILE_SECRET_KEY || ""
      if (!key) throw new Error("Turnstile requires TURNSTILE_SECRET_KEY env var")
      currentProvider = new TurnstileCaptcha(key)
      return currentProvider
    }
    case "recaptcha":
    case "google": {
      const key = config?.secretKey || process.env.RECAPTCHA_SECRET_KEY || ""
      if (!key) throw new Error("reCAPTCHA requires RECAPTCHA_SECRET_KEY env var")
      currentProvider = new RecaptchaCaptcha(key)
      return currentProvider
    }
    default:
      throw new Error("Captcha provider not configured. Set CAPTCHA_PROVIDER=turnstile or CAPTCHA_PROVIDER=recaptcha")
  }
}

export function getCaptcha(): CaptchaProvider | null {
  return currentProvider
}

// ═══════════════════════════════════════════════════
// Middleware
// ═══════════════════════════════════════════════════

export function captchaMiddleware(captcha: CaptchaProvider) {
  return async (c: any, next: any) => {
    const q = () => c.req.query || c.req.query?.bind?.(c.req)
    const token = c.req.header("X-Captcha-Token") ||
                  c.req.query?.("cf-turnstile-response") ||
                  c.req.query?.("g-recaptcha-response") ||
                  c.req.query?.("captcha") ||
                  ""

    if (!token) {
      return c.json({ error: "Captcha token required" }, 400)
    }

    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip")

    const valid = await captcha.verifyToken(t, ip)
    if (!valid) {
      return c.json({ error: "Captcha verification failed" }, 403)
    }

    return next()
  }
}

// ═══════════════════════════════════════════════════
// API endpoint
// ═══════════════════════════════════════════════════

export function registerCaptchaRoutes(app: any) {
  app.post("/api/captcha/verify", async (c: any) => {
    try {
      const captcha = getCaptcha()
      if (!captcha) return c.json({ error: "Captcha not configured" }, 400)

      const body = await c.req.json() as any
      const token = body.token || body["cf-turnstile-response"] || body["g-recaptcha-response"]
      if (!token) return c.json({ error: "Missing captcha token" }, 400)

      const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip")
      const valid = await captcha.verifyToken(token, ip)
      return c.json({ success: valid })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })
}
