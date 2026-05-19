import { Slot } from "expo-router"
import { AuthProvider } from "../src/hooks/useAuth"

export default function Root() {
  return <AuthProvider><Slot /></AuthProvider>
}
