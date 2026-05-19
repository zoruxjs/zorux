import type { StorageProvider } from "./types"

export interface S3Config {
  endpoint?: string
  region?: string
  bucket: string
  accessKey?: string
  secretKey?: string
  publicUrl?: boolean
}

function getS3Config(): S3Config {
  const endpoint = process.env.S3_ENDPOINT || ""
  const region = process.env.S3_REGION || "us-east-1"
  const bucket = process.env.S3_BUCKET || ""
  const accessKey = process.env.S3_ACCESS_KEY || ""
  const secretKey = process.env.S3_SECRET_KEY || ""
  if (!bucket) throw new Error("S3 requires S3_BUCKET env var")
  return { endpoint, region, bucket, accessKey, secretKey }
}

export function createS3Storage(config?: S3Config): StorageProvider {
  const cfg = config || getS3Config()

  let client: any = null
  let commandClass: any = null

  function getClient() {
    if (!client) {
      const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
      commandClass = PutObjectCommand
      const opts: any = { region: cfg.region }
      if (cfg.endpoint) opts.endpoint = cfg.endpoint
      if (cfg.accessKey && cfg.secretKey) {
        opts.credentials = { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey }
      }
      if (!cfg.endpoint && !cfg.accessKey) {
        opts.credentials = { accessKeyId: "minioadmin", secretAccessKey: "minioadmin" }
      }
      client = new S3Client(opts)
    }
    return client
  }

  function publicUrl(key: string): string {
    if (cfg.publicUrl && cfg.endpoint) return cfg.endpoint.replace(/\/$/, "") + "/" + cfg.bucket + "/" + key
    return "/" + key
  }

  return {
    async upload(name: string, data: Uint8Array | Blob): Promise<string> {
      const buf = data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : Buffer.from(data)
      const cmd = new commandClass({ Bucket: cfg.bucket, Key: name, Body: buf })
      await getClient().send(cmd)
      return publicUrl(name)
    },
    url(path: string) { return path },
  }
}
