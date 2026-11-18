/** All-pass ring resonator geometry in micrometres. The ring and bus are distinct guides. */
export type RingPoint = { x: number; y: number }
export type RingGeometry = {
  bus: RingPoint[]
  ring: RingPoint[]
  ports: { name: 'o1' | 'o2'; x: number; y: number; angle: number; width: number }[]
  radius: number
  gap: number
  width: number
  busLength: number
  center: RingPoint
}
export function makeRingResonator(width = 0.5, radius = 10, gap = 0.2, busLength = 40, samples = 128): RingGeometry | null {
  if (![width, radius, gap, busLength, samples].every(Number.isFinite) || width <= 0 || radius <= width / 2 || gap <= 0 || busLength <= 0 || !Number.isInteger(samples) || samples < 16 || samples > 4096) return null
  // The bus may be shorter than the ring diameter; only positive length is required.
  // Bus centreline is y=0; ring lies above the bus with edge-to-edge gap.
  const center = { x: busLength / 2, y: -(radius + width + gap) }
  const ring = Array.from({ length: samples + 1 }, (_, i) => {
    const a = 2 * Math.PI * i / samples
    return { x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) }
  })
  return { bus: [{ x: 0, y: 0 }, { x: busLength, y: 0 }], ring,
    ports: [{ name: 'o1', x: 0, y: 0, angle: 180, width }, { name: 'o2', x: busLength, y: 0, angle: 0, width }],
    radius, gap, width, busLength, center }
}
