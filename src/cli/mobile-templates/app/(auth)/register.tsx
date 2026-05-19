import { useState } from "react"
import { router } from "expo-router"
import { Container, Input, Button, Title, ErrorMsg } from "../../src/components/ui"
import { register } from "../../src/api/auth"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleRegister = async () => {
    setLoading(true); setError("")
    try {
      await register(name, email, password)
      router.replace("/(tabs)")
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return <Container>
    <Title>Create account</Title>
    <ErrorMsg message={error} />
    <Input placeholder="Name" value={name} onChangeText={setName} />
    <Input placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
    <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
    <Button title="Create account" onPress={handleRegister} loading={loading} />
    <Button title="Back to login" onPress={() => router.push("/(auth)/login")} />
  </Container>
}
