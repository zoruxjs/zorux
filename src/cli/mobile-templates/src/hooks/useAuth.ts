import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { restoreToken, getMe, logout as apiLogout, type AuthUser } from "../api/auth"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, logout: async () => {}, refresh: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const u = await getMe()
    setUser(u)
    setLoading(false)
  }

  useEffect(() => {
    restoreToken().then(() => refresh())
  }, [])

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, logout, refresh }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
