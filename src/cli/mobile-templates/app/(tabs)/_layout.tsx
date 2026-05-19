import { Tabs } from "expo-router"
import { useAuth } from "../../src/hooks/useAuth"
import { ActivityIndicator, View } from "react-native"

export default function TabsLayout() {
  const { user, loading } = useAuth()

  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" }}>
    <ActivityIndicator color="#3b82f6" size="large" />
  </View>

  return <Tabs screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="index" options={{ title: "Home" }} />
  </Tabs>
}
