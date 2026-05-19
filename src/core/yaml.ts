import type { AppConfig, FieldDef, ModelDef } from './types'
import { load as yamlLoad } from 'js-yaml'
import { readFileSync } from 'fs'
import { join } from 'path'
import { appConfigSchema } from './validation'

export function parseAppConfig(rootDir: string): AppConfig {
  const yamlPath = join(rootDir, 'app.yaml')
  const raw = readFileSync(yamlPath, 'utf-8')
  const parsed = yamlLoad(raw)
  return appConfigSchema.parse(parsed)
}
