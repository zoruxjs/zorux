<!-- maturity: ✅ Stable -->
> **✅ Stable** — This feature is ready for production

# Declarative Forms

Zorux generates complete HTML forms from YAML definitions — no manual HTML, no custom routes, no boilerplate validation.

## Quick Start

```yaml
# app.yaml
forms:
  subscribe:
    title: Newsletter
    description: Subscribe to our newsletter
    model: Subscriber
    fields:
      - email
      - name
    button: Subscribe
    success:
      message: "Thanks for subscribing!"
    honeypot: true
```

This single definition generates:

| Route | Description |
|---|---|
| `GET /forms/subscribe` | DaisyUI form with validation |
| `POST /forms/subscribe` | Submit handler + create record |
| `GET /forms/subscribe/success` | Confirmation page |

## Configuration

```yaml
forms:
  <name>:                # Form identifier (used in route path)
    title: string        # Page title (default: capitalized name)
    description: string  # Subtitle text below title
    model: string        # Optional — model to save submissions to
    fields:              # Array of field definitions
      - name: string     # Field name (matches model field)
        type: string     # text | email | textarea | number | file | select
        label: string    # Display label
        required: bool   # Whether field is required
        placeholder: string
        options: string[] # For select fields
      - fieldName        # Shorthand: uses model field definition
    button: string       # Submit button text (default: "Submit")
    honeypot: bool       # Enable anti-bot hidden field (default: false)
    rateLimit: string    # Rate limit policy name
    submit:
      action: string     # "create" (default) | "hook"
      redirect: string   # Redirect URL after success
    success:
      message: string    # Success message text
      email:
        subject: string  # Optional confirmation email subject
        template: string # Email template name
```

## Field Types

| Type | HTML Element | Validation |
|---|---|---|
| `text` | `<input type="text">` | Required check |
| `email` | `<input type="email">` | Required + `@` check |
| `number` | `<input type="number">` | Required check |
| `textarea` | `<textarea>` | Required check |
| `select` | `<select>` with options | Required check |
| `file` | `<input type="file">` | — |

## Shorthand Fields

If a `model` is specified, fields can be referenced by name only:

```yaml
forms:
  subscribe:
    model: Subscriber
    fields:
      - email      # Uses type/label/required from Subscriber model
      - name
```

## Honeypot Protection

When `honeypot: true`, an invisible field `_hp` is rendered. Bots auto-fill it; humans don't see it. If the field has a value on submission, the form silently accepts without saving — blocking spam without annoying users.

## Success Page

After successful submission, the user is redirected to:

```
GET /forms/<name>/success
```

Shows a DaisyUI card with the configured `success.message`.

## Examples

### Contact Form

```yaml
forms:
  contact:
    title: Contact Us
    description: Send us a message
    fields:
      - name: name
        type: text
        label: Your Name
        required: true
      - name: email
        type: email
        label: Your Email
        required: true
      - name: message
        type: textarea
        label: Message
        required: true
    button: Send Message
    success:
      message: "Message sent!"
```

### Waitlist with Model

```yaml
forms:
  waitlist:
    title: Join the Waitlist
    model: WaitlistEntry
    fields:
      - email
      - name
    button: Join
    success:
      message: "You're on the list!"
    honeypot: true
```
