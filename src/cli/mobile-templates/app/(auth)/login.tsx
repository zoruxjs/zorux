import { useState } from "react"
import { router } from "expo-router"
import { Container, Input, Button, Title, ErrorMsg } from "../../src/components/ui"
import { login } from "../../src/api/auth"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    setLoading(true); setError("")
    try {
      await login(email, password)
      router.replace("/(tabs)")
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return <Container>
    <Title>Sign in</Title>
    <ErrorMsg message={error} />
    <Input placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
    <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
    <Button title="Sign in" onPress={handleLogin} loading={loading} />
    <Button title="Create account" onPress={() => router.push("/(auth)/register")} />
  </Container>
}
