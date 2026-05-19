import { api, setToken } from "./client"
import * as SecureStore from "expo-secure-store"

export interface AuthUser { id: number; name: string; email: string }

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const data = await api.post<{ token: string; user: AuthUser }>("/api/auth/login", { email, password })
  await SecureStore.setItemAsync("token", data.token)
  setToken(data.token)
  return data
}

export async function register(name: string, email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const data = await api.post<{ token: string; user: AuthUser }>("/api/auth/register", { name, email, password })
  await SecureStore.setItemAsync("token", data.token)
  setToken(data.token)
  return data
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    const data = await api.get<{ user: AuthUser }>("/api/auth/me")
    return data.user
  } catch { return null }
}

export async function restoreToken(): Promise<string | null> {
  const t = await SecureStore.getItemAsync("token")
  if (t) setToken(t)
  return t
}

export async function logout() {
  await SecureStore.deleteItemAsync("token")
  setToken(null)
}
