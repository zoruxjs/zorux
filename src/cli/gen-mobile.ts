import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs"
import { join, relative } from "path"
import { parseAppConfig } from "../core/yaml"
import { compileModels } from "../core/compiler"

export function genMobileCommand(rootDir: string) {
  const config = parseAppConfig(rootDir)
  const models = compileModels(config.models)
  const mobileDir = join(rootDir, "mobile")

  if (existsSync(mobileDir)) {
    console.log("Mobile directory already exists. Delete it first or use a different project.")
    process.exit(1)
  }

  console.log("Generating mobile app from " + config.name + "...")

  // Copy template files
  const templateDir = join(import.meta.dir, "mobile-templates")
  copyTemplate(templateDir, mobileDir)

  if (config.realtime?.enabled) {
    const rtPath = join(templateDir, "src", "api", "realtime.ts")
    if (existsSync(rtPath)) {
      writeFileSync(join(mobileDir, "src", "api", "realtime.ts"), readFileSync(rtPath, "utf-8"))
      console.log("  - Realtime hook included")
    }
  }

  // Generate per-model screens
  for (const model of models) {
    genModelList(mobileDir, model)
    genModelDetail(mobileDir, model)
    genModelNew(mobileDir, model, config)
    genModelEdit(mobileDir, model)
    genModelApi(mobileDir, model)
  }

  // Update dashboard with model list
  updateDashboard(mobileDir, models)

  console.log("Mobile app generated at " + mobileDir)
  console.log("Run: cd " + relative(process.cwd(), mobileDir) + " && bun install && bun start")
}

function copyTemplate(src: string, dest: string) {
  function copyRec(s: string, d: string) {
    mkdirSync(d, { recursive: true })
    for (const entry of readdirSync(s, { withFileTypes: true })) {
      const sp = join(s, entry.name)
      const dp = join(d, entry.name)
      if (entry.name.startsWith("MODEL_")) continue
      if (entry.isDirectory()) copyRec(sp, dp)
      else writeFileSync(dp, readFileSync(sp, "utf-8"))
    }
  }
  copyRec(src, dest)
}

function genModelList(mobileDir: string, model: any) {
  let content = readFileSync(join(import.meta.dir, "mobile-templates", "MODEL_LIST.tsx"), "utf-8")
  content = content.replace(/\/\/MODEL\/\//g, model.tableName)
  content = content.replace(/\/\/MODEL_NAME\/\//g, model.name)
  const dir = join(mobileDir, "app", "(tabs)", model.tableName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "index.tsx"), content)
}

function genModelDetail(mobileDir: string, model: any) {
  let content = readFileSync(join(import.meta.dir, "mobile-templates", "MODEL_DETAIL.tsx"), "utf-8")
  content = content.replace(/\/\/MODEL\/\//g, model.tableName)
  content = content.replace(/\/\/MODEL_NAME\/\//g, model.name)
  const dir = join(mobileDir, "app", "(tabs)", model.tableName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "[id].tsx"), content)
}

function genModelNew(mobileDir: string, model: any, _config: any) {
  let content = readFileSync(join(import.meta.dir, "mobile-templates", "MODEL_NEW.tsx"), "utf-8")
  content = content.replace(/\/\/MODEL\/\//g, model.tableName)
  content = content.replace(/\/\/MODEL_NAME\/\//g, model.name)

  const fields = model.fields.filter((f: any) => !f.isRelation && f.name !== "password")
  const hasFiles = fields.some((f: any) => f.type === "file")
  const fieldInputs: string[] = []
  const fieldValidations: string[] = []

  for (const f of fields) {
    const label = f.name.charAt(0).toUpperCase() + f.name.slice(1)
    const key = f.name
    const isTextarea = f.type === "text"
    const isNumber = ["int", "float"].includes(f.type)
    const isFile = f.type === "file"
    const isRequired = f.isRequired
    const min = f.min
    const max = f.max

    // Validation
    if (isRequired) {
      fieldValidations.push(`    if (!form["${key}"]) errs["${key}"] = "${label} is required"`)
    }
    if (min !== undefined && !isFile) {
      const check = isNumber ? `Number(form["${key}"]) < ${min}` : `String(form["${key}"] || "").length < ${min}`
      fieldValidations.push(`    if (form["${key}"] && ${check}) errs["${key}"] = "Minimum ${label} is ${min}"`)
    }
    if (max !== undefined && !isFile) {
      const check = isNumber ? `Number(form["${key}"]) > ${max}` : `String(form["${key}"] || "").length > ${max}`
      fieldValidations.push(`    if (form["${key}"] && ${check}) errs["${key}"] = "Maximum ${label} is ${max}"`)
    }
    if (f.type === "email") {
      fieldValidations.push(`    if (form["${key}"] && !form["${key}"].includes("@")) errs["${key}"] = "Invalid email"`)
    }
    if (f.enum) {
      const vals = f.enum.map((v: string) => `"${v}"`).join(", ")
      fieldValidations.push(`    if (form["${key}"] && ![${vals}].includes(form["${key}"])) errs["${key}"] = "Must be one of: ${f.enum.join(", ")}"`)
    }

    // Input
    if (isFile) {
      fieldInputs.push(`    <Text style={{ color: "#94a3b8", marginBottom: 4, fontSize: 13 }}>${label}</Text>
    <TouchableOpacity style={{ backgroundColor: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#334155" }} onPress={async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All })
      if (!result.canceled) setForm({...form, "${key}": result.assets[0] })
    }}>
      <Text style={{ color: "#3b82f6" }}>{form["${key}"] ? "File selected" : "Choose ${label}"}</Text>
    </TouchableOpacity>
    {form["${key}"] ? <ImagePreview uri={typeof form["${key}"] === "string" ? form["${key}"] : form["${key}"]?.uri} /> : null}`)
    } else if (isTextarea) {
      fieldInputs.push(`    <Input placeholder="${label}" value={form["${key}"]} onChangeText={(v: string) => setForm({...form, "${key}": v})} multiline numberOfLines={4} error={errors["${key}"]} />`)
    } else {
      fieldInputs.push(`    <Input placeholder="${label}" value={form["${key}"]} onChangeText={(v: string) => setForm({...form, "${key}": v})} keyboardType="${isNumber ? "numeric" : "default"}" error={errors["${key}"]} />`)
    }
  }

  content = content.replace("//FIELDS//", fieldInputs.join("\n"))
  content = content.replace("//FIELDS_VALIDATION//", fieldValidations.join("\n"))
  content = content.replace("//HAS_FILES//", hasFiles ? "true" : "false")

  const dir = join(mobileDir, "app", "(tabs)", model.tableName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "new.tsx"), content)
}

function genModelEdit(mobileDir: string, model: any) {
  let content: string
  try {
    content = readFileSync(join(import.meta.dir, "mobile-templates", "MODEL_EDIT.tsx"), "utf-8")
  } catch {
    return // Template doesn't exist
  }
  content = content.replace(/\/\/MODEL\/\//g, model.tableName)
  content = content.replace(/\/\/MODEL_NAME\/\//g, model.name)

  const fields = model.fields.filter((f: any) => !f.isRelation && f.name !== "password")
  const fieldInputs = fields.map((f: any) => {
    const label = f.name.charAt(0).toUpperCase() + f.name.slice(1)
    const key = f.name
    const isTextarea = f.type === "text"
    const isNumber = ["int", "float"].includes(f.type)
    if (isTextarea) {
      return `    <Input placeholder="${label}" value={form["${key}"]} onChangeText={(v: string) => setForm({...form, "${key}": v})} multiline numberOfLines={4} />`
    }
    return `    <Input placeholder="${label}" value={form["${key}"]} onChangeText={(v: string) => setForm({...form, "${key}": v})} keyboardType="${isNumber ? "numeric" : "default"}" />`
  }).join("\n")

  content = content.replace("//FIELDS//", fieldInputs)
  const dir = join(mobileDir, "app", "(tabs)", model.tableName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "[id].edit.tsx"), content)
}

function genModelApi(mobileDir: string, model: any) {
  const fields = model.fields.filter((f: any) => !f.isRelation && f.name !== "password")
  const content = [
    "import { api, buildPath } from \"./client\"",
    "",
    "export interface " + model.name + " {",
    "  id: number",
    ...fields.map((f: any) => "  " + f.name + ": " + (f.type === "int" || f.type === "float" ? "number" : "string") + (f.isRequired ? "" : " | null")),
    "}",
    "",
    "export const " + model.tableName + "Api = {",
    "  list: (params?: string) => api.get<" + model.name + "[]>(buildPath(\"" + model.tableName + "\") + (params ? \"?\" + params : \"\")),",
    "  get: (id: number | string) => api.get<" + model.name + ">(buildPath(\"" + model.tableName + "\", id)),",
    "  create: (data: Partial<" + model.name + ">) => api.post<" + model.name + ">(buildPath(\"" + model.tableName + "\"), data),",
    "  update: (id: number | string, data: Partial<" + model.name + ">) => api.put<" + model.name + ">(buildPath(\"" + model.tableName + "\", id), data),",
    "  remove: (id: number | string) => api.del<{ success: boolean }>(buildPath(\"" + model.tableName + "\", id)),",
    "}",
    "",
  ].join("\n")

  const dir = join(mobileDir, "src", "api")
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, model.tableName + ".ts"), content)
}

function updateDashboard(mobileDir: string, models: any[]) {
  const indexPath = join(mobileDir, "app", "(tabs)", "index.tsx")
  if (!existsSync(indexPath)) return

  const modelList = JSON.stringify(models.map((m: any) => ({ name: m.name, table: m.tableName })))
  let content = readFileSync(indexPath, "utf-8")
  content = content.replace("//MODELS_PLACEHOLDER//", modelList)
  writeFileSync(indexPath, content)
}
