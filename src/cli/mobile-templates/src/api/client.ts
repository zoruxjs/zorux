const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"

let token: string | null = null

export function setToken(t: string | null) { token = t }

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = "Bearer " + token
  const res = await fetch(API_URL + path, { ...opts, headers: { ...headers, ...opts.headers as any } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || "Request failed")
  }
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: any) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: any) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}

export function buildPath(model: string, id?: number | string) {
  return "/api/" + model.toLowerCase() + "s" + (id ? "/" + id : "")
}
