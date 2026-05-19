import { useState, useEffect } from "react"
import { ScrollView } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { Container, Input, Button, Title, ErrorMsg } from "../../src/components/ui"
import { api, buildPath } from "../../src/api/client"

export default function ModelEdit() {
  const { id } = useLocalSearchParams()
  const [form, setForm] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [apiError, setApiError] = useState("")

  useEffect(() => {
    api.get(buildPath("//MODEL//", id as string))
      .then((data: any) => setForm(data))
      .catch((e: any) => setApiError(e.message))
      .finally(() => setFetching(false))
  }, [id])

  const handleSubmit = async () => {
    setLoading(true)
    setApiError("")
    try {
      await api.put(buildPath("//MODEL//", id as string), form)
      router.back()
    } catch (e: any) { setApiError(e.message) }
    finally { setLoading(false) }
  }

  if (fetching) return <Container><Title>Loading...</Title></Container>

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a", padding: 16 }}>
      <Title>Edit //MODEL_NAME//</Title>
      <ErrorMsg message={apiError} />
      //FIELDS//
      <Button title="Save" onPress={handleSubmit} loading={loading} />
    </ScrollView>
  )
}
