import type { WaveguidePolygon } from './waveguide'

/** GDSII export, DBU = 1 nm (0.001 um). Only validated polygons are accepted. */
const DBU_PER_UM = 1000
const I32_MAX = 2147483647
const I32_MIN = -2147483648
const enc = new TextEncoder()

function u16(n: number): number[] { return [(n >>> 8) & 255, n & 255] }
function i32(n: number): number[] { return [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255] }
function record(type: number, datatype: number, payload: number[] = []): number[] {
  if (payload.length % 2) throw new Error('GDS record payload must have even length')
  if (payload.length + 4 > 65535) throw new Error('GDS record too large')
  return [...u16(payload.length + 4), type, datatype, ...payload]
}
function ascii(s: string): number[] {
  const bytes = [...enc.encode(s)]
  if (bytes.some(b => b > 127)) throw new Error('GDS names must be ASCII')
  if (bytes.length % 2) bytes.push(0)
  return bytes
}
/** Encode positive finite value as GDSII base-16 real8. */
function real8(value: number): number[] {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid GDS real8 value')
  if (value === 0) return Array(8).fill(0)
  let exponent = 64
  let mantissa = value
  while (mantissa >= 1) { mantissa /= 16; exponent++ }
  while (mantissa < 1 / 16) { mantissa *= 16; exponent-- }
  if (exponent < 0 || exponent > 127) throw new Error('GDS real8 out of range')
  const out = [exponent]
  for (let i = 0; i < 7; i++) {
    mantissa *= 256
    const byte = Math.floor(mantissa)
    out.push(byte)
    mantissa -= byte
  }
  return out
}
function coordinate(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Nonfinite polygon coordinate')
  const scaled = Math.round(value * DBU_PER_UM)
  if (scaled > I32_MAX || scaled < I32_MIN) throw new Error('Coordinate exceeds GDS int32 range')
  return scaled
}
function normalizeName(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_$?]{0,31}$/.test(name)) throw new Error('Invalid GDS cell name (ASCII, <=32 characters)')
  return name
}
export function exportWaveguidesGDS(polygons: WaveguidePolygon[], cellName = 'WEBPDA_TOP'): Uint8Array {
  normalizeName(cellName)
  if (polygons.length === 0) throw new Error('No waveguide polygons to export')
  const data: number[] = []
  const push = (type: number, datatype: number, payload: number[] = []) => data.push(...record(type, datatype, payload))
  // Fixed deterministic timestamp (12 x 16-bit fields): 2026-01-01 00:00:00.
  const date = [2026, 1, 1, 0, 0, 0, 2026, 1, 1, 0, 0, 0].flatMap(u16)
  push(0x00, 0x02, u16(600)) // HEADER
  push(0x01, 0x02, date) // BGNLIB
  push(0x02, 0x06, ascii('WEBPDA')) // LIBNAME
  // user unit = 1 um, database unit = 1 nm (GDS UNITS values in meters)
  push(0x03, 0x05, [...real8(0.001), ...real8(1e-9)])
  push(0x05, 0x02, date) // BGNSTR
  push(0x06, 0x06, ascii(cellName)) // STRNAME
  for (const polygon of polygons) {
    if (!polygon.valid || polygon.warning) throw new Error('Invalid waveguide polygon: ' + (polygon.warning ?? 'validation failed'))
    if (polygon.layer !== '1/0' || !Number.isFinite(polygon.width) || polygon.width <= 0) throw new Error('Unsupported waveguide layer or width')
    const raw = polygon.vertices.map(p => [coordinate(p.x), coordinate(p.y)] as const)
    const unique: (readonly [number, number])[] = []
    for (const p of raw) {
      const prev = unique[unique.length - 1]
      if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) unique.push(p)
    }
    if (unique.length > 1 && unique[0][0] === unique[unique.length - 1][0] && unique[0][1] === unique[unique.length - 1][1]) unique.pop()
    if (unique.length < 3) throw new Error('Degenerate polygon after DBU quantization')
    if (unique.length > 199) throw new Error('Polygon exceeds conservative GDSII limit of 199 vertices; fracture before export')
    let twiceArea = 0
    for (let i = 0; i < unique.length; i++) {
      const a = unique[i], b = unique[(i + 1) % unique.length]
      twiceArea += a[0] * b[1] - b[0] * a[1]
    }
    if (Math.abs(twiceArea) < 1) throw new Error('Zero-area polygon after DBU quantization')
    push(0x08, 0x00) // BOUNDARY
    push(0x0d, 0x02, u16(1)) // LAYER
    push(0x0e, 0x02, u16(0)) // DATATYPE
    const xy = [...unique, unique[0]].flatMap(([x, y]) => [...i32(x), ...i32(y)])
    push(0x10, 0x03, xy) // XY
    push(0x11, 0x00) // ENDEL
  }
  push(0x07, 0x00) // ENDSTR
  push(0x04, 0x00) // ENDLIB
  return Uint8Array.from(data)
}
