import { makeGratingCoupler } from './gratingCoupler'
import { makeRingResonator } from './ringResonator'
import { makeDirectionalCoupler } from './directionalCoupler'
export type PCellType = 'straight' | 'bend' | 'sbend' | 'dc' | 'ring' | 'gc'
export type PCell = { id: string; type: PCellType; x: number; y: number; rotation: number; width: number; length: number; radius: number; offset: number; gap: number; couplingLength: number; transitionLength: number; portPitch: number; period: number; dutyCycle: number; teethCount: number; gratingWidth: number }
export type Port = { name: string; x: number; y: number; angle: number; width: number }
export const DEFAULT_WIDTH = 0.5
export function createPCell(type: PCellType, index: number): PCell {
  return { id: `${type}_${index}`, type, x: 20 + index * 5, y: 25 + index * 5, rotation: 0, width: DEFAULT_WIDTH, length: type === 'ring' ? 40 : 30, radius: 15, offset: 10, gap: 0.2, couplingLength: 20, transitionLength: 20, portPitch: 10, period: 0.64, dutyCycle: 0.5, teethCount: 20, gratingWidth: 12 }
}
export function localPorts(cell: PCell): Port[] {
  if (cell.type === 'straight') return [
    { name: 'o1', x: 0, y: 0, angle: 180, width: cell.width },
    { name: 'o2', x: cell.length, y: 0, angle: 0, width: cell.width },
  ]
  if (cell.type === 'sbend') return [
    { name: 'o1', x: 0, y: 0, angle: 180, width: cell.width },
    { name: 'o2', x: cell.length, y: cell.offset, angle: 0, width: cell.width },
  ]
  if (cell.type === 'gc') return makeGratingCoupler(cell.width, cell.length, cell.period, cell.dutyCycle, cell.teethCount, cell.gratingWidth)?.ports ?? []
  if (cell.type === 'ring') return makeRingResonator(cell.width, cell.radius, cell.gap, cell.length)?.ports ?? []
  if (cell.type === 'dc') return makeDirectionalCoupler(cell.width, cell.gap, cell.couplingLength, cell.transitionLength, cell.portPitch)?.ports ?? []
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
  return typeof p.id === 'string' && (p.type === 'straight' || p.type === 'bend' || p.type === 'sbend' || p.type === 'dc' || p.type === 'ring' || p.type === 'gc') &&
    ['x', 'y', 'rotation', 'width', 'length', 'radius'].every(k => typeof p[k] === 'number' && Number.isFinite(p[k])) &&
    (p.width as number) > 0 && (p.length as number) > 0 && (p.radius as number) > 0 && (p.type !== 'sbend' || (typeof p.offset === 'number' && Number.isFinite(p.offset))) && (p.type !== 'ring' || makeRingResonator(p.width as number, p.radius as number, p.gap as number, p.length as number) !== null) && (p.type !== 'gc' || makeGratingCoupler(p.width as number, p.length as number, p.period as number, p.dutyCycle as number, p.teethCount as number, p.gratingWidth as number) !== null) && (p.type !== 'dc' || makeDirectionalCoupler(p.width as number, p.gap as number, p.couplingLength as number, p.transitionLength as number, p.portPitch as number) !== null)
}
