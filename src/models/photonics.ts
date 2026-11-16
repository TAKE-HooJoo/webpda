export type PCellType = 'straight' | 'bend'
export type PCell = { id: string; type: PCellType; x: number; y: number; rotation: number; width: number; length: number; radius: number }
export type Port = { name: string; x: number; y: number; angle: number; width: number }
export const DEFAULT_WIDTH = 0.5
export function createPCell(type: PCellType, index: number): PCell {
  return { id: `${type}_${index}`, type, x: 20 + index * 5, y: 25 + index * 5, rotation: 0, width: DEFAULT_WIDTH, length: 30, radius: 15 }
}
export function localPorts(cell: PCell): Port[] {
  if (cell.type === 'straight') return [
    { name: 'o1', x: 0, y: 0, angle: 180, width: cell.width },
    { name: 'o2', x: cell.length, y: 0, angle: 0, width: cell.width },
  ]
  return [
    { name: 'o1', x: 0, y: 0, angle: 180, width: cell.width },
    { name: 'o2', x: cell.radius, y: -cell.radius, angle: 270, width: cell.width },
  ]
}
export function rotatePoint(x: number, y: number, degrees: number) {
  const a = degrees * Math.PI / 180
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) }
}
export function worldPorts(cell: PCell): Port[] {
  return localPorts(cell).map(port => {
    const p = rotatePoint(port.x, port.y, cell.rotation)
    return { ...port, x: cell.x + p.x, y: cell.y + p.y, angle: (port.angle + cell.rotation) % 360 }
  })
}
export function isPCell(value: unknown): value is PCell {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return typeof p.id === 'string' && (p.type === 'straight' || p.type === 'bend') &&
    ['x', 'y', 'rotation', 'width', 'length', 'radius'].every(k => typeof p[k] === 'number' && Number.isFinite(p[k])) &&
    (p.width as number) > 0 && (p.length as number) > 0 && (p.radius as number) > 0
}
