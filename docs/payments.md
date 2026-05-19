# Payments

Zorux supports Stripe and Polar.sh for payment processing with checkout sessions, subscriptions, webhooks, and customer management.

## Configuration

```yaml
payments:
  provider: stripe              # stripe | polar
  stripe:
    secretKey: "${STRIPE_SECRET_KEY}"
    webhookSecret: "${STRIPE_WEBHOOK_SECRET}"
  polar:
    token: "${POLAR_TOKEN}"
```

## Providers

### Stripe

```yaml
payments:
  provider: stripe
  stripe:
    secretKey: "${STRIPE_SECRET_KEY}"
    webhookSecret: "${STRIPE_WEBHOOK_SECRET}"
```

**Environment Variables:**

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |

**Package:** `stripe` (npm) — lazy loaded

### Polar.sh

```yaml
payments:
  provider: polar
  polar:
    token: "${POLAR_TOKEN}"
```

**Environment Variable:** `POLAR_TOKEN`

**API:** `https://api.polar.sh/v1`

## Provider Interface

```typescript
interface PaymentProvider {
  name: string
  createCheckout(options: CheckoutOptions): Promise<CheckoutResult>
  createSubscription(customerId: string, priceId: string): Promise<SubscriptionResult>
  cancelSubscription(subscriptionId: string): Promise<void>
  getSubscription(subscriptionId: string): Promise<SubscriptionResult | null>
  handleWebhook(rawBody: Buffer, signature: string): Promise<{ event: string; data: any }>
  createCustomer(email: string, name?: string): Promise<string>
}
```

## Checkout Sessions

### Create Checkout

```bash
POST /api/payments/checkout
Content-Type: application/json

{
  "priceId": "price_xxxxx",
  "customerEmail": "john@example.com",
  "successUrl": "https://myapp.com/success",
  "cancelUrl": "https://myapp.com/cancel",
  "metadata": {
    "userId": "123"
  },
  "quantity": 1
}
```

**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `priceId` | string | Yes | Stripe/Polar price ID |
| `customerEmail` | string | No | Customer email |
| `customerId` | string | No | Existing customer ID |
| `successUrl` | string | Yes | Redirect on success |
| `cancelUrl` | string | Yes | Redirect on cancel |
| `metadata` | object | No | Custom metadata |
| `quantity` | number | No | Quantity (default: 1) |

**Response:**

```json
{
  "sessionId": "cs_xxxxx",
  "url": "https://checkout.stripe.com/pay/cs_xxxxx"
}
```

## Customers

### Create Customer

```bash
POST /api/payments/customer
Content-Type: application/json

{
  "email": "john@example.com",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "customerId": "cus_xxxxx"
}
```

## Subscriptions

### Create Subscription

```bash
POST /api/payments/subscription
Content-Type: application/json

{
  "customerId": "cus_xxxxx",
  "priceId": "price_xxxxx"
}
```

**Response:**

```json
{
  "subscriptionId": "sub_xxxxx",
  "status": "active",
  "currentPeriodEnd": "2026-02-01T00:00:00Z"
}
```

### Cancel Subscription

```bash
DELETE /api/payments/subscription/:id
```

### Get Subscription

```bash
GET /api/payments/subscription/:id
```

## Webhooks

### Webhook Handler

```bash
POST /api/payments/webhook
```

Handles payment provider webhook events automatically.

### Stripe Webhook Events

| Event | Description |
|---|---|
| `checkout.session.completed` | Payment completed |
| `customer.subscription.created` | Subscription started |
| `customer.subscription.updated` | Subscription changed |
| `customer.subscription.deleted` | Subscription cancelled |
| `invoice.payment_succeeded` | Invoice paid |
| `invoice.payment_failed` | Invoice payment failed |

### Setting Up Webhooks

**Stripe Dashboard:**

1. Go to Developers → Webhooks
2. Add endpoint: `https://myapp.com/api/payments/webhook`
3. Select events to listen to
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

**Polar Dashboard:**

1. Go to Settings → Webhooks
2. Add endpoint: `https://myapp.com/api/payments/webhook`
3. Copy the API token to `POLAR_TOKEN`

## Usage in Actions

```typescript
// actions/upgrade.ts
export const upgrade = F.auth(async (ctx) => {
  const { priceId } = await ctx.req.json()
  const user = ctx.get("user")

  const { url } = await payments.createCheckout({
    priceId,
    customerEmail: user.email,
    successUrl: "https://myapp.com/dashboard?upgraded=true",
    cancelUrl: "https://myapp.com/pricing",
    metadata: { userId: user.id }
  })

  return F.json({ url })
})
```

## Environment Setup

### Stripe

1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard → Developers → API keys
3. Set environment variables:

```bash
export STRIPE_SECRET_KEY="sk_test_xxxxx"
export STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
```

### Polar

1. Create account at [polar.sh](https://polar.sh)
2. Get API token from Settings
3. Set environment variable:

```bash
export POLAR_TOKEN="pol_xxxxx"
```
