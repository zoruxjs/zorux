import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native"
import { router } from "expo-router"
import { useAuth } from "../src/hooks/useAuth"
import { Container, Card, Title } from "../src/components/ui"

const MODELS = //MODELS_PLACEHOLDER//

const colors = { text: "#f1f5f9", card: "#1e293b", border: "#334155" }

export default function Home() {
  const { user, logout } = useAuth()

  return <Container>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <Title>Dashboard</Title>
      <TouchableOpacity onPress={logout}><Text style={{ color: "#ef4444" }}>Logout</Text></TouchableOpacity>
    </View>
    <Text style={{ color: colors.text, marginBottom: 16 }}>Welcome, {user?.name}!</Text>
    <FlatList
      data={MODELS}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => router.push("/(tabs)/" + item.table)}>
          <Card><Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>{item.name}</Text></Card>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.table}
    />
  </Container>
}
