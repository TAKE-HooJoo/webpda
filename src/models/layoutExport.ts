import type { PCell } from './photonics'
import { rotatePoint, worldPorts } from './photonics'
import type { RouteConnection } from './router'
import { resolvePort } from './router'
import { calculateCSC, type RoutePoint } from './dubins'
import { makeWaveguidePolygon, type WaveguidePolygon } from './waveguide'
import { exportWaveguidesGDS } from './gds'

const MAX_CENTERLINE_POINTS = 90 // 2*N vertices <= 180, below GDS 199 limit

function polygonParts(points: RoutePoint[], width: number, label: string): WaveguidePolygon[] {
  const result: WaveguidePolygon[] = []
  if (points.length < 2) throw new Error(`${label}: centerline has fewer than two points`)
  for (let from = 0; from < points.length - 1; from += MAX_CENTERLINE_POINTS - 1) {
    const part = points.slice(from, Math.min(points.length, from + MAX_CENTERLINE_POINTS))
    const polygon = makeWaveguidePolygon(part, width)
    if (!polygon || !polygon.valid) throw new Error(`${label}: ${polygon?.warning ?? 'invalid polygon'}`)
    result.push(polygon)
  }
  return result
}

function cellPoints(cell: PCell): RoutePoint[] {
  if (cell.type === 'straight') {
    const ports = worldPorts(cell)
    return ports.map(p => ({ x: p.x, y: p.y }))
  }
  const count = Math.max(2, Math.ceil(Math.PI * cell.radius / (2 * 0.5)))
  const points: RoutePoint[] = []
  for (let i = 0; i <= count; i++) {
    const angle = -Math.PI / 2 + (Math.PI / 2) * i / count
    // Circle center at (0, -radius), starting at (0,0), ending at (radius,-radius)
    const x = cell.radius * Math.cos(angle)
    const y = -cell.radius - cell.radius * Math.sin(angle)
    const rotated = rotatePoint(x, y, cell.rotation)
    points.push({ x: cell.x + rotated.x, y: cell.y + rotated.y })
  }
  return points
}

/** Collects validated polygons for every PCell and routed connection. */
export function collectLayoutPolygons(cells: PCell[], connections: RouteConnection[]): WaveguidePolygon[] {
  const polygons: WaveguidePolygon[] = []
  for (const cell of cells) polygons.push(...polygonParts(cellPoints(cell), cell.width, cell.id))
  for (const route of connections) {
    const start = resolvePort(cells, route.start)
    const end = resolvePort(cells, route.end)
    if (!start || !end) throw new Error(`${route.id}: missing port`)
    if (Math.abs(start.width - end.width) > 1e-6 || Math.abs(start.width - route.width) > 1e-6)
      throw new Error(`${route.id}: port width mismatch`)
    const path = calculateCSC(start, end, route.minRadius)
    if (!path) throw new Error(`${route.id}: no valid CSC path`)
    polygons.push(...polygonParts(path.points, route.width, route.id))
  }
  return polygons
}

export function exportLayoutGDS(cells: PCell[], connections: RouteConnection[]): Uint8Array {
  return exportWaveguidesGDS(collectLayoutPolygons(cells, connections))
}
