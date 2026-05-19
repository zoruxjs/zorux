import type { AppConfig } from "../types"
import type { PlatformAdapter } from "../platform"

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface CheckoutOptions {
  priceId: string
  customerId?: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
  quantity?: number
}

export interface CheckoutResult {
  url: string
  sessionId: string
}

export interface SubscriptionResult {
  id: string
  status: string
  customerId: string
  currentPeriodStart: number
  currentPeriodEnd: number
}

export interface PaymentProvider {
  name: string
  createCheckout(options: CheckoutOptions): Promise<CheckoutResult>
  createSubscription(customerId: string, priceId: string): Promise<SubscriptionResult>
  cancelSubscription(subscriptionId: string): Promise<void>
  getSubscription(subscriptionId: string): Promise<SubscriptionResult | null>
  handleWebhook(rawBody: string, signature: string): Promise<{ event: string; data: any }>
  createCustomer(email: string, name?: string): Promise<string>
}

// ═══════════════════════════════════════════════════
// Stripe Provider
// ═══════════════════════════════════════════════════

class StripePaymentProvider implements PaymentProvider {
  name = "stripe"
  private stripe: any

  constructor(apiKey: string) {
    const Stripe = require("stripe")
    this.stripe = new Stripe(apiKey)
  }

  async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: options.priceId, quantity: options.quantity || 1 }],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      customer: options.customerId,
      customer_email: options.customerId ? undefined : options.customerEmail,
      metadata: options.metadata,
    })
    return { url: session.url, sessionId: session.id }
  }

  async createSubscription(customerId: string, priceId: string): Promise<SubscriptionResult> {
    const sub = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    })
    return {
      id: sub.id,
      status: sub.status,
      customerId: sub.customer,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId)
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId)
    if (!sub) return null
    return {
      id: sub.id,
      status: sub.status,
      customerId: sub.customer,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
    }
  }

  async handleWebhook(rawBody: string, signature: string): Promise<{ event: string; data: any }> {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ""
    let event: any
    if (endpointSecret) {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)
    } else {
      event = JSON.parse(rawBody)
    }
    return { event: event.type, data: event.data?.object || event.data }
  }

  async createCustomer(email: string, name?: string): Promise<string> {
    const customer = await this.stripe.customers.create({ email, name })
    return customer.id
  }
}

// ═══════════════════════════════════════════════════
// Polar.sh Provider
// ═══════════════════════════════════════════════════

class PolarPaymentProvider implements PaymentProvider {
  name = "polar"
  private token: string
  private baseUrl: string

  constructor(token: string, baseUrl?: string) {
    this.token = token
    this.baseUrl = baseUrl || "https://api.polar.sh/v1"
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const res = await fetch(this.baseUrl + path, {
      method,
      headers: { Authorization: "Bearer " + this.token, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error("[polar] " + res.status + ": " + text)
    }
    return res.json()
  }

  async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
    const result = await this.request("/checkout/sessions", {
      product_price_id: options.priceId,
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      customer_id: options.customerId,
      customer_email: options.customerEmail,
      metadata: options.metadata,
    })
    return { url: result.url, sessionId: result.id }
  }

  async createSubscription(customerId: string, priceId: string): Promise<SubscriptionResult> {
    const result = await this.request("/subscriptions", {
      customer_id: customerId,
      product_price_id: priceId,
    })
    return {
      id: result.id,
      status: result.status,
      customerId: result.customer_id,
      currentPeriodStart: new Date(result.current_period_start).getTime() / 1000,
      currentPeriodEnd: new Date(result.current_period_end).getTime() / 1000,
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.request("/subscriptions/" + subscriptionId + "/cancel", {})
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
    try {
      const result = await this.request("/subscriptions/" + subscriptionId)
      return {
        id: result.id,
        status: result.status,
        customerId: result.customer_id,
        currentPeriodStart: new Date(result.current_period_start).getTime() / 1000,
        currentPeriodEnd: new Date(result.current_period_end).getTime() / 1000,
      }
    } catch {
      return null
    }
  }

  async handleWebhook(rawBody: string, _signature: string): Promise<{ event: string; data: any }> {
    const payload = JSON.parse(rawBody)
    return { event: payload.type, data: payload.data }
  }

  async createCustomer(email: string, name?: string): Promise<string> {
    const result = await this.request("/customers", { email, name })
    return result.id
  }
}

// ═══════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════

let currentProvider: PaymentProvider | null = null

export function createPaymentProvider(config?: { provider?: string }): PaymentProvider {
  const provider = config?.provider || process.env.PAYMENTS_PROVIDER || ""

  switch (provider) {
    case "stripe": {
      const apiKey = process.env.STRIPE_SECRET_KEY || ""
      if (!apiKey) throw new Error("Stripe requires STRIPE_SECRET_KEY env var")
      currentProvider = new StripePaymentProvider(apiKey)
      return currentProvider
    }
    case "polar": {
      const token = process.env.POLAR_TOKEN || ""
      if (!token) throw new Error("Polar.sh requires POLAR_TOKEN env var")
      currentProvider = new PolarPaymentProvider(token)
      return currentProvider
    }
    default:
      throw new Error("Payment provider not configured. Set PAYMENTS_PROVIDER=stripe or PAYMENTS_PROVIDER=polar")
  }
}

export function getPaymentProvider(): PaymentProvider | null {
  return currentProvider
}

// ═══════════════════════════════════════════════════
// Route registration
// ═══════════════════════════════════════════════════

export function registerPaymentRoutes(app: any, _config: AppConfig, _platform: PlatformAdapter) {
  const provider = getPaymentProvider()
  if (!provider) return

  const endpoint = "/api/payments"

  // POST /api/payments/checkout — create checkout session
  app.post(endpoint + "/checkout", async (c: any) => {
    try {
      const body = await c.req.json() as CheckoutOptions
      const result = await provider.createCheckout(body)
      return c.json(result)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // POST /api/payments/customer — create customer
  app.post(endpoint + "/customer", async (c: any) => {
    try {
      const { email, name } = await c.req.json() as any
      const id = await provider.createCustomer(email, name)
      return c.json({ customerId: id })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // POST /api/payments/subscription — create subscription
  app.post(endpoint + "/subscription", async (c: any) => {
    try {
      const { customerId, priceId } = await c.req.json() as any
      const result = await provider.createSubscription(customerId, priceId)
      return c.json(result)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // DELETE /api/payments/subscription/:id — cancel
  app.delete(endpoint + "/subscription/:id", async (c: any) => {
    try {
      await provider.cancelSubscription(c.req.param("id"))
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // POST /api/payments/webhook — handle webhooks
  app.post(endpoint + "/webhook", async (c: any) => {
    try {
      const rawBody = await c.req.text()
      const signature = c.req.header("stripe-signature") || ""
      const result = await provider.handleWebhook(rawBody, signature)
      return c.json(result)
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })
}
