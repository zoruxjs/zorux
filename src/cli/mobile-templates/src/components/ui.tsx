import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native"
import type { ReactNode } from "react"

const s = {
  container: { flex: 1, padding: 16, backgroundColor: "#0f172a" } as const,
  card: { backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#334155" } as const,
  title: { fontSize: 24, fontWeight: "700", color: "#f1f5f9", marginBottom: 16 } as const,
  muted: { fontSize: 13, color: "#94a3b8", marginTop: 2 } as const,
  error: { color: "#ef4444", fontSize: 14, marginBottom: 8 } as const,
  input: { backgroundColor: "#1e293b", borderRadius: 8, padding: 12, color: "#f1f5f9", fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: "#334155" } as const,
  inputError: { borderColor: "#ef4444" } as const,
  button: { backgroundColor: "#3b82f6", borderRadius: 8, padding: 14, alignItems: "center", marginBottom: 12 } as const,
  buttonDanger: { backgroundColor: "#ef4444" } as const,
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" } as const,
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } as const,
  badge: { backgroundColor: "#3b82f6", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 } as const,
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" } as const,
  toast: { backgroundColor: "#22c55e", borderRadius: 8, padding: 12, marginBottom: 12 } as const,
  toastError: { backgroundColor: "#ef4444" } as const,
  toastText: { color: "#fff", fontSize: 14, fontWeight: "500" } as const,
  imagePreview: { width: "100%", height: 200, borderRadius: 8, marginBottom: 12 } as const,
  emptyState: { alignItems: "center", padding: 40 } as const,
  emptyText: { color: "#64748b", fontSize: 16, textAlign: "center" } as const,
  searchBar: { backgroundColor: "#1e293b", borderRadius: 8, padding: 12, color: "#f1f5f9", fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#334155" } as const,
}

export function Container({ children }: { children: ReactNode }) { return <View style={s.container}>{children}</View> }
export function Card({ children }: { children: ReactNode }) { return <View style={s.card}>{children}</View> }
export function Title({ children }: { children: ReactNode }) { return <Text style={s.title}>{children}</Text> }
export function Label({ children }: { children: ReactNode }) { return <Text style={{ ...s.muted, marginBottom: 4 }}>{children}</Text> }
export function TextMuted({ children }: { children: ReactNode }) { return <Text style={s.muted}>{children}</Text> }
export function ErrorMsg({ message }: { message?: string }) { return message ? <Text style={s.error}>{message}</Text> : null }
export function Toast({ message, type }: { message?: string; type?: "success" | "error" }) {
  if (!message) return null
  return <View style={[s.toast, type === "error" ? s.toastError : null]}><Text style={s.toastText}>{message}</Text></View>
}

export function Input({ value, onChangeText, placeholder, secureTextEntry, error, multiline, numberOfLines, keyboardType, ...props }: any) {
  return (
    <View>
      <TextInput
        style={[s.input, multiline ? { height: 80, textAlignVertical: "top" } : null, error ? s.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType || "default"}
        {...props}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  )
}

export function Button({ title, onPress, loading, variant, disabled }: { title: string; onPress: () => void; loading?: boolean; variant?: "danger"; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.button, variant === "danger" ? s.buttonDanger : null, disabled ? { opacity: 0.5 } : null]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{title}</Text>}
    </TouchableOpacity>
  )
}

export function Badge({ text }: { text: string }) {
  return <View style={s.badge}><Text style={s.badgeText}>{text}</Text></View>
}

export function ImagePreview({ uri }: { uri?: string | null }) {
  if (!uri) return null
  return <Image source={{ uri }} style={s.imagePreview} resizeMode="cover" />
}

export function EmptyState({ message }: { message?: string }) {
  return (
    <View style={s.emptyState}>
      <Text style={s.emptyText}>{message || "No data available"}</Text>
    </View>
  )
}

export function confirmDelete(title: string, onConfirm: () => void) {
  Alert.alert("Delete " + title, "Are you sure? This cannot be undone.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ])
}
