import { useState, useEffect } from "react"
import { FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, View, Text, TextInput } from "react-native"
import { router } from "expo-router"
import { Container, Card, Title, TextMuted, Button, EmptyState, Badge } from "../../src/components/ui"
import { api, buildPath } from "../../src/api/client"

export default function ModelList() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    try {
      setError("")
      let url = buildPath("//MODEL//")
      if (search) url += "?search=" + encodeURIComponent(search)
      setData(await api.get(url))
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [search])

  const displayData = Array.isArray(data) ? data : data?.data || []

  if (loading) return <Container><ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 40 }} /></Container>

  return <Container>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <Title>//MODEL_NAME//</Title>
      <Button title="+ New" onPress={() => router.push("/(tabs)//MODEL//" + "/new")} />
    </View>

    <TextInput
      style={{ backgroundColor: "#1e293b", borderRadius: 8, padding: 12, color: "#f1f5f9", fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#334155" }}
      placeholder="Search..."
      placeholderTextColor="#64748b"
      value={search}
      onChangeText={setSearch}
    />

    {error ? <Text style={{ color: "#ef4444", marginBottom: 8 }}>{error}</Text> : null}

    <FlatList
      data={displayData}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
      renderItem={({ item }: { item: any }) => (
        <TouchableOpacity onPress={() => router.push("/(tabs)//MODEL//" + "/" + item.id)}>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#f1f5f9", flex: 1 }}>
                {item.title || item.name || "Item #" + item.id}
              </Text>
              {item.status ? <Badge text={item.status} /> : null}
            </View>
            <TextMuted>{item.email || item.description || "ID: " + item.id}</TextMuted>
          </Card>
        </TouchableOpacity>
      )}
      keyExtractor={(item: any) => String(item.id)}
      ListEmptyComponent={<EmptyState message={search ? "No results for \"" + search + "\"" : "No records found"} />}
    />
  </Container>
}
