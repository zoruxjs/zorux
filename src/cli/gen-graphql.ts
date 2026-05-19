import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join, relative } from "path"
import { parseAppConfig } from "../core/yaml"
import { compileModels } from "../core/compiler"
import { buildGraphQLSchema } from "../core/graphql"

export function genGraphQLCommand(rootDir: string) {
  const config = parseAppConfig(rootDir)
  const models = compileModels(config.models, config.auth?.model)

  const graphqlDir = join(rootDir, "graphql")
  mkdirSync(graphqlDir, { recursive: true })

  // Generate schema from models
  const { typeDefs } = buildGraphQLSchema(models, { collection: () => ({}) })

  // Write schema.graphql
  writeFileSync(join(graphqlDir, "schema.graphql"), typeDefs.trim() + "\n")

  // Generate example queries
  const exampleQueries = models.map(m => {
    return `# List ${m.plural}
query List${m.name}s {
  ${m.tableName}List(limit: 10) {
    data { id ${m.fields.filter(f => !f.isRelation && f.name !== "password").slice(0, 3).map(f => f.name).join(" ") } }
    pagination { page limit total totalPages }
  }
}

# Get ${m.name} by ID
query Get${m.name} {
  ${m.tableName}(id: 1) { id ${m.fields.filter(f => !f.isRelation && f.name !== "password").slice(0, 3).map(f => f.name).join(" ") } }
}

# Create ${m.name}
mutation Create${m.name} {
  create${m.name}(data: { ${m.fields.filter(f => !f.isRelation && f.name !== "password").slice(0, 2).map(f => ` ${f.name}: "${f.type === "int" || f.type === "float" ? "0" : "value"}" `).join(", ")} }) { id ${m.fields.filter(f => !f.isRelation && f.name !== "password").slice(0, 3).map(f => f.name).join(" ") } }
}
`
  }).join("\n")

  writeFileSync(join(graphqlDir, "examples.gql"), exampleQueries.trim() + "\n")

  console.log("  - Created graphql/schema.graphql")
  console.log("  - Created graphql/examples.gql")
  console.log("")
  console.log("  GraphQL endpoint: POST /api/graphql")
  console.log("")
  console.log("  Example:")
  console.log('    curl -X POST http://localhost:3000/api/graphql \\')
  console.log('      -H "Content-Type: application/json" \\')
  console.log('      -d \'{"query": "{ ' + models[0]?.tableName + 'List { data { id } } }"}\'')
  console.log("")
}
