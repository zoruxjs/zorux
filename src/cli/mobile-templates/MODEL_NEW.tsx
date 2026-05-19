import { useState } from "react"
import { ScrollView, Text, TouchableOpacity } from "react-native"
import { router } from "expo-router"
import { Container, Input, Button, Title, ErrorMsg, ImagePreview } from "../../src/components/ui"
import * as ImagePicker from "expo-image-picker"
import { api, buildPath } from "../../src/api/client"

export default function ModelNew() {
  const [form, setForm] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState("")

  const validate = () => {
    const errs: Record<string, string> = {}
    //FIELDS_VALIDATION//
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setApiError("")
    try {
      // Detect if there are file fields
      const hasFiles = //HAS_FILES//
      if (hasFiles) {
        const formData = new FormData()
        for (const [key, val] of Object.entries(form)) {
          if (val instanceof File || (val as any)?.uri) {
            formData.append(key, val as any)
          } else if (val !== undefined && val !== null) {
            formData.append(key, String(val))
          }
        }
        await fetch("http://localhost:3000" + buildPath("//MODEL//"), {
          method: "POST",
          headers: { Authorization: "Bearer " + (globalThis as any).token },
          body: formData,
        })
      } else {
        await api.post(buildPath("//MODEL//"), form)
      }
      router.back()
    } catch (e: any) { setApiError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a", padding: 16 }}>
      <Title>New //MODEL_NAME//</Title>
      <ErrorMsg message={apiError} />
      //FIELDS//
      <Button title="Create" onPress={handleSubmit} loading={loading} />
    </ScrollView>
  )
}
