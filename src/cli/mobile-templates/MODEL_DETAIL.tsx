import { useState, useEffect } from "react"
import { View, Text, ActivityIndicator, ScrollView } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { Container, Card, Title, TextMuted, Button, ImagePreview, confirmDelete, Toast } from "../../src/components/ui"
import { api, buildPath } from "../../src/api/client"

export default function ModelDetail() {
  const { id } = useLocalSearchParams()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")

  useEffect(() => {
    api.get(buildPath("//MODEL//", id as string))
      .then(setItem)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Container><ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 40 }} /></Container>
  if (error) return <Container><Title>Error</Title><TextMuted>{error}</TextMuted></Container>
  if (!item) return <Container><Title>Not found</Title><TextMuted>The record does not exist.</TextMuted></Container>

  const hiddenFields = ["id", "password", "created_at", "updated_at"]

  return <Container>
    <ScrollView>
      <Toast message={toast} type="success" />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Title>{item.title || item.name || "Item #" + item.id}</Title>
          {item.status ? <TextMuted>Status: {item.status}</TextMuted> : null}
        </View>
      </View>

      <Card>
        {Object.entries(item).filter(([k]) => !hiddenFields.includes(k) && k !== "password").map(([key, value]) => {
          if (typeof value === "string" && (value.startsWith("http") || value.startsWith("/uploads"))) {
            const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(value)
            return (
              <View key={key} style={{ marginBottom: 12 }}>
                <TextMuted>{key}</TextMuted>
                {isImage ? <ImagePreview uri={value} /> : <Text style={{ color: "#3b82f6" }}>{value}</Text>}
              </View>
            )
          }
          if (value === null || value === undefined) return null
          return (
            <View key={key} style={{ marginBottom: 8 }}>
              <TextMuted>{key}</TextMuted>
              <Text style={{ color: "#f1f5f9", fontSize: 15 }}>{String(value)}</Text>
            </View>
          )
        })}
      </Card>

      <Button title="Edit" onPress={() => router.push("/(tabs)//MODEL//" + "/" + item.id + "/edit")} />
      <Button title="Delete" variant="danger" onPress={() => confirmDelete("//MODEL_NAME//", async () => {
        try {
          await api.del(buildPath("//MODEL//", item.id))
          setToast("Deleted successfully")
          setTimeout(() => router.back(), 500)
        } catch (e: any) { setToast(e.message) }
      })} />
    </ScrollView>
  </Container>
}
