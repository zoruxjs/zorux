// ═══════════════════════════════════════════════════
// UUID v7 Generator (RFC 9562)
// Zero dependencies, cryptographically secure
// ═══════════════════════════════════════════════════

// UUID v7 layout: 48-bit timestamp | 74-bit random
// Format: tttttttt-tttt-Vrrr-rrrr-rrrrrrrrrrrr
//         |--timestamp--||-version-||--random--|

export function uuidv7(): string {
  // UUID v7: 48-bit timestamp | 4-bit version | 12-bit rand_a | 2-bit variant | 62-bit rand_b
  // Hex: tttttttttttt-Vvvv-Nrrr-rrrrrrrrrrrr (36 chars)
  const time = Date.now()

  // Generate 128 bits of randomness
  const buf = crypto.getRandomValues(new Uint8Array(10))

  // Timestamp (48 bits) — 12 hex chars
  const tHex = time.toString(16).padStart(12, "0")

  // Version + rand_a (16 bits): 4 bits version (0111) + 12 bits rand_a
  const va = (buf[0] << 8 | buf[1]) & 0x0fff // 12 bits rand_a
  const vHex = "7" + va.toString(16).padStart(3, "0")

  // Variant + rand_b (16 bits): 2 bits variant (10) + 14 bits rand_b
  const vb = ((buf[2] << 8 | buf[3]) & 0x3fff) | 0x8000 // variant 10xx
  const vBhex = vb.toString(16).padStart(4, "0")

  // Remaining rand_b (48 bits) — 12 hex chars
  const r1 = (buf[4] << 8 | buf[5]) << 8 | buf[6]
  const r2 = (buf[7] << 8 | buf[8]) << 8 | buf[9]
  const rHex = (r1.toString(16) + r2.toString(16)).padStart(12, "0")

  return `${tHex.slice(0, 8)}-${tHex.slice(8)}-${vHex}-${vBhex}-${rHex}`
}

// Validate UUID v7 format
export function isValidUUIDv7(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

// Extract timestamp from UUID v7
export function getUUIDv7Timestamp(id: string): number | null {
  if (!isValidUUIDv7(id)) return null
  const hex = id.replace(/-/g, "")
  const tsHex = hex.slice(0, 12)
  return parseInt(tsHex, 16)
}
