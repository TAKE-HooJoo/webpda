import { type PCell, type Port, worldPorts } from './photonics'

export type PortRef = { cellId: string; portName: string }
export type RouteConnection = { id: string; start: PortRef; end: PortRef; width: number; minRadius: number }
export function samePort(a: PortRef | null, b: PortRef | null): boolean {
  return !!a && !!b && a.cellId === b.cellId && a.portName === b.portName
}
export function resolvePort(cells: PCell[], ref: PortRef | null): Port | null {
  if (!ref) return null
  const cell = cells.find(c => c.id === ref.cellId)
  return cell ? worldPorts(cell).find(p => p.name === ref.portName) ?? null : null
}
export function isPortRef(value: unknown): value is PortRef {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.cellId === 'string' && typeof v.portName === 'string'
}
export function isRouteConnection(value: unknown): value is RouteConnection {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && isPortRef(v.start) && isPortRef(v.end) &&
    typeof v.width === 'number' && Number.isFinite(v.width) && v.width > 0 &&
    typeof v.minRadius === 'number' && Number.isFinite(v.minRadius) && v.minRadius > 0 &&
    !samePort(v.start, v.end)
}
