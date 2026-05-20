import { Hono } from "hono"

export interface FormField {
  name: string
  type: string
  label?: string
  required?: boolean
  placeholder?: string
  options?: string[]
}

export interface FormDef {
  model?: string
  fields: (string | FormField)[]
  submit?: {
    action?: string
    redirect?: string
  }
  success?: {
    message?: string
    email?: {
      subject?: string
      template?: string
    }
  }
  honeypot?: boolean
  rateLimit?: string
  title?: string
  description?: string
  button?: string
}

export function registerForms(app: Hono, forms: Record<string, FormDef>, config: any) {
  for (const [name, def] of Object.entries(forms)) {
    registerForm(app, name, def, config)
  }
}

function registerForm(app: Hono, name: string, def: FormDef, config: any) {
  const resolvedFields = resolveFields(def, config)
  const path = `/forms/${name}`

  // GET — render form
  app.get(path, (c) => {
    const html = renderForm(name, def, resolvedFields, null, null)
    return c.html(html)
  })

  // POST — handle submission
  app.post(path, async (c) => {
    const body = await c.req.parseBody()
    const errors: Record<string, string> = {}

    // Honeypot check
    if (def.honeypot && body._hp) {
      // Bot detected — silently accept
      return c.redirect(`${path}?success=1`)
    }

    // Validate fields
    for (const field of resolvedFields) {
      if (field.required && !body[field.name]) {
        errors[field.name] = `${field.label || field.name} is required`
      }
      if (field.type === "email" && body[field.name] && !String(body[field.name]).includes("@")) {
        errors[field.name] = "Invalid email address"
      }
    }

    if (Object.keys(errors).length > 0) {
      const html = renderForm(name, def, resolvedFields, body, errors)
      return c.html(html, 422)
    }

    // Create record via API if model is specified
    if (def.model && def.submit?.action !== "hook") {
      try {
        const apiUrl = `http://localhost:${parseInt(process.env.PORT || "3000")}/api/${def.model.toLowerCase()}s`
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          const html = renderForm(name, def, resolvedFields, body, { _api: err.error || "Submission failed" })
          return c.html(html, 422)
        }
      } catch (err: any) {
        const html = renderForm(name, def, resolvedFields, body, { _api: "Service unavailable" })
        return c.html(html, 500)
      }
    }

    // Success — redirect or show message
    if (def.submit?.redirect) {
      return c.redirect(def.submit.redirect)
    }
    return c.redirect(`${path}?success=1`)
  })

  // GET — success page
  app.get(`${path}/success`, (c) => {
    const msg = def.success?.message || "Form submitted successfully!"
    return c.html(`<!DOCTYPE html>
<html lang="en" data-theme="light">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${def.title || name} — Success</title>
<link rel="stylesheet" href="/static/admin.css"/>
</head>
<body class="min-h-screen flex items-center justify-center bg-base-200 p-4">
  <div class="card bg-base-100 border border-base-300 max-w-md w-full">
    <div class="card-body text-center p-8">
      <div class="text-4xl mb-3">✅</div>
      <h2 class="card-title text-xl justify-center">${msg}</h2>
      <p class="text-sm opacity-60 mt-1">We've received your submission.</p>
      <a href="/" class="btn btn-primary mt-4">Go home</a>
    </div>
  </div>
</body>
</html>`)
  })
}

function resolveFields(def: FormDef, config: any): FormField[] {
  const modelFields = def.model ? config.models?.[def.model]?.fields || {} : {}
  return def.fields.map(f => {
    if (typeof f === "string") {
      const fieldType = modelFields[f] || "string"
      return {
        name: f,
        type: inferType(fieldType as string),
        label: f.charAt(0).toUpperCase() + f.slice(1),
        required: String(fieldType).includes("required"),
        placeholder: `Enter ${f}`,
      }
    }
    return f as FormField
  })
}

function inferType(type: string): string {
  if (type.includes("email")) return "email"
  if (type.includes("password")) return "password"
  if (type.includes("int") || type.includes("float") || type.includes("number")) return "number"
  if (type.includes("text") || type.includes("content")) return "textarea"
  if (type.includes("file")) return "file"
  return "text"
}

function renderForm(name: string, def: FormDef, fields: FormField[], values: any | null, errors: Record<string, string> | null): string {
  const title = def.title || name.charAt(0).toUpperCase() + name.slice(1)
  const desc = def.description || ""
  const btnText = def.button || "Submit"
  const showSuccess = typeof values === "string" ? false : values === null ? false : (values as any)?.success
  const hp = def.honeypot ? `<div style="position:absolute;left:-9999px"><input type="text" name="_hp" tabindex="-1" autocomplete="off"/></div>` : ""

  // Check for success query param
  const hasSuccess = false // Handled by redirect to /success

  const fieldHtml = fields.map(f => {
    const val = values ? String(values[f.name] || "") : ""
    const err = errors?.[f.name]
    const isTextarea = f.type === "textarea"
    const isSelect = f.options && f.options.length > 0
    const isFile = f.type === "file"

    return `<fieldset class="fieldset">
      <legend class="fieldset-legend text-sm font-medium">${f.label || f.name}</legend>
      ${isSelect
        ? `<select name="${f.name}" class="select w-full">${f.options!.map(o => `<option value="${o}" ${val === o ? "selected" : ""}>${o}</option>`).join("")}</select>`
        : isTextarea
        ? `<textarea name="${f.name}" class="textarea w-full" placeholder="${f.placeholder || ""}" ${f.required ? "required" : ""}>${val}</textarea>`
        : isFile
        ? `<input type="file" name="${f.name}" class="file-input file-input-soft w-full" />`
        : `<input type="${f.type}" name="${f.name}" value="${val}" class="input w-full" placeholder="${f.placeholder || ""}" ${f.required ? "required" : ""} />`
      }
      ${err ? `<p class="text-xs text-error mt-0.5">${err}</p>` : ""}
    </fieldset>`
  }).join("\n      ")

  const apiErr = errors?._api ? `<div role="alert" class="alert alert-error text-sm mb-3"><span>${errors._api}</span></div>` : ""

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title} — ${name}</title>
  <link rel="stylesheet" href="/static/admin.css"/>
</head>
<body class="min-h-screen flex items-center justify-center bg-base-200 p-4">
  <div class="card bg-base-100 border border-base-300 max-w-lg w-full">
    <div class="card-body p-6">
      <h2 class="card-title text-xl">${title}</h2>
      ${desc ? `<p class="text-sm opacity-60 mb-2">${desc}</p>` : ""}
      ${apiErr}
      <form method="POST" action="/forms/${name}" enctype="${fields.some(f => f.type === "file") ? "multipart/form-data" : "application/x-www-form-urlencoded"}">
        ${hp}
        ${fieldHtml}
        <button type="submit" class="btn btn-primary w-full mt-3">${btnText}</button>
      </form>
    </div>
  </div>
</body>
</html>`
}
