# Mobile (Expo)

<!-- maturity: 🔬 Experimental -->
> **🔬 Experimental** — This feature is in early development — not recommended for production


Zorux generates a complete Expo React Native mobile app from your `app.yaml` with typed SDK, auth screens, per-model CRUD, real-time updates, and file uploads.

## Generation

```bash
zorux gen mobile
```

This creates an `mobile/` directory with a full Expo project.

## Project Structure

```
mobile/
├── app.json                    # Expo config
├── package.json
├── tsconfig.json
├── app/                        # Expo Router (file-based)
│   ├── _layout.tsx             # Root layout
│   ├── index.tsx               # Home screen
│   ├── login.tsx               # Login screen
│   ├── register.tsx            # Register screen
│   └── [model]/                # Per-model screens
│       ├── index.tsx           # List screen
│       ├── new.tsx             # Create screen
│       └── [id].tsx            # Edit screen
├── src/
│   ├── sdk/                    # Typed SDK per model
│   │   └── index.ts
│   ├── hooks/                  # React hooks
│   │   └── useRealtime.ts
│   ├── components/             # Shared components
│   └── config.ts               # API configuration
└── assets/                     # App icons, splash screen
```

## Configuration

```typescript
// src/config.ts
export const API_URL = "http://localhost:3000/api"
export const WS_URL = "ws://localhost:3000/ws"
```

Change these to your production API URL before building.

## Typed SDK

The SDK is auto-generated from your models with full TypeScript types.

```typescript
// src/sdk/index.ts

// User API
export const users = {
  list: (params?: ListParams) => api.get("/users", params),
  get: (id: number) => api.get(`/users/${id}`),
  create: (data: CreateUserInput) => api.post("/users", data),
  update: (id: number, data: UpdateUserInput) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
}

// Post API
export const posts = {
  list: (params?: ListParams) => api.get("/posts", params),
  get: (id: number) => api.get(`/posts/${id}`),
  create: (data: CreatePostInput) => api.post("/posts", data),
  update: (id: number, data: UpdatePostInput) => api.put(`/posts/${id}`, data),
  delete: (id: number) => api.delete(`/posts/${id}`),
}
```

### Types

```typescript
interface User {
  id: number
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

interface CreateUserInput {
  name: string
  email: string
  password: string
}

interface ListParams {
  page?: number
  limit?: number
  search?: string
  sort?: string
  order?: "asc" | "desc"
}
```

## Auth Screens

### Login

```typescript
// app/login.tsx
import { auth } from "../src/sdk"

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async () => {
    const { token, user } = await auth.login({ email, password })
    // Store token, navigate to home
  }

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
      <Button title="Login" onPress={handleLogin} />
    </View>
  )
}
```

### Register

```typescript
// app/register.tsx
import { auth } from "../src/sdk"

export default function RegisterScreen() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleRegister = async () => {
    const { token, user } = await auth.register({ name, email, password })
    // Store token, navigate to home
  }

  return (
    <View>
      <TextInput value={name} onChangeText={setName} placeholder="Name" />
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
      <Button title="Register" onPress={handleRegister} />
    </View>
  )
}
```

## Per-Model CRUD Screens

### List Screen

```typescript
// app/posts/index.tsx
import { posts } from "../../src/sdk"
import { useRealtime } from "../../src/hooks/useRealtime"

export default function PostListScreen() {
  const [data, setData] = useState<Post[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // Real-time updates
  useRealtime("posts", (event, record) => {
    if (event === "created") setData(prev => [record, ...prev])
    if (event === "updated") setData(prev => prev.map(p => p.id === record.id ? record : p))
    if (event === "deleted") setData(prev => prev.filter(p => p.id !== record.id))
  })

  const fetchData = async () => {
    const { rows } = await posts.list({ page: 1, limit: 20 })
    setData(rows)
  }

  useEffect(() => { fetchData() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <PostCard post={item} />}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  )
}
```

### Create Screen

```typescript
// app/posts/new.tsx
import { posts } from "../../src/sdk"

export default function PostCreateScreen() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")

  const handleCreate = async () => {
    await posts.create({ title, body, authorId: currentUserId })
    router.back()
  }

  return (
    <View>
      <TextInput value={title} onChangeText={setTitle} placeholder="Title" />
      <TextInput value={body} onChangeText={setBody} placeholder="Body" multiline />
      <Button title="Create" onPress={handleCreate} />
    </View>
  )
}
```

### Edit Screen

```typescript
// app/posts/[id].tsx
import { posts } from "../../src/sdk"

export default function PostEditScreen({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")

  useEffect(() => {
    posts.get(Number(id)).then(setPost)
  }, [id])

  useEffect(() => {
    if (post) {
      setTitle(post.title)
      setBody(post.body)
    }
  }, [post])

  const handleUpdate = async () => {
    await posts.update(Number(id), { title, body })
    router.back()
  }

  if (!post) return <ActivityIndicator />

  return (
    <View>
      <TextInput value={title} onChangeText={setTitle} placeholder="Title" />
      <TextInput value={body} onChangeText={setBody} placeholder="Body" multiline />
      <Button title="Update" onPress={handleUpdate} />
    </View>
  )
}
```

## Real-time Hook

```typescript
// src/hooks/useRealtime.ts
import { useEffect, useRef } from "react"

export function useRealtime(topic: string, callback: (event: string, data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ subscribe: topic }))
    }

    ws.onmessage = (event) => {
      const { topic: t, data } = JSON.parse(event.data)
      const [, eventType] = t.split(":")
      callback(eventType, data)
    }

    return () => { ws.close() }
  }, [topic, callback])
}
```

## File Upload

Uses Expo ImagePicker for file selection:

```typescript
import * as ImagePicker from "expo-image-picker"

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  })

  if (!result.canceled) {
    const formData = new FormData()
    formData.append("coverImage", {
      uri: result.assets[0].uri,
      name: result.assets[0].fileName,
      type: result.assets[0].mimeType,
    } as any)

    await posts.create({
      title: "New Post",
      body: "Content",
      coverImage: formData,
    })
  }
}
```

## Form Validation

```typescript
function validatePost(data: CreatePostInput): string[] {
  const errors: string[] = []
  if (!data.title || data.title.length < 3) errors.push("Title must be at least 3 characters")
  if (!data.body) errors.push("Body is required")
  return errors
}
```

## Running the Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Run on physical device (scan QR code)
npx expo start
```

## Building for Production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android
```
