import { makeGratingCoupler } from './gratingCoupler'
import { makeRingResonator } from './ringResonator'
import { makeDirectionalCoupler } from './directionalCoupler'
import { makeSBend } from './sbend'
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
  if (cell.type === 'sbend') {
    const geometry = makeSBend(cell.length, cell.offset, cell.width)
    if (!geometry) throw new Error(`${cell.id}: invalid S-Bend`)
    return geometry.points.map(point => {
      const rotated = rotatePoint(point.x, point.y, cell.rotation)
      return { x: cell.x + rotated.x, y: cell.y + rotated.y }
    })
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
  for (const cell of cells) {
    if (cell.type === 'gc') {
      const gc = makeGratingCoupler(cell.width, cell.length, cell.period, cell.dutyCycle, cell.teethCount, cell.gratingWidth)
      if (!gc) throw new Error(`${cell.id}: invalid grating coupler`)
      const transform = (p: {x:number;y:number}) => { const r=rotatePoint(p.x,p.y,cell.rotation); return {x:cell.x+r.x,y:cell.y+r.y} }
      for (const shape of [gc.taper, ...gc.teeth]) polygons.push({layer:'1/0',width:cell.width,vertices:shape.map(transform),valid:true})
    } else if (cell.type === 'ring') {
      const ring = makeRingResonator(cell.width, cell.radius, cell.gap, cell.length)
      if (!ring) throw new Error(`${cell.id}: invalid ring resonator`)
      const transform = (p: {x:number;y:number}) => { const r = rotatePoint(p.x,p.y,cell.rotation); return {x:cell.x+r.x,y:cell.y+r.y} }
      polygons.push(...polygonParts(ring.bus.map(transform),cell.width,`${cell.id}/bus`))
      // GDS BOUNDARY has no holes: tessellate the annulus into independent quadrilateral sectors.
      // A closed centerline polygon would incorrectly fill the ring interior.
      for (let i=0; i<ring.ring.length-1; i++) {
        const a=2*Math.PI*i/(ring.ring.length-1), b=2*Math.PI*(i+1)/(ring.ring.length-1)
        const outer=cell.radius+cell.width/2, inner=cell.radius-cell.width/2
        const local=[{x:ring.center.x+outer*Math.cos(a),y:ring.center.y+outer*Math.sin(a)}, {x:ring.center.x+outer*Math.cos(b),y:ring.center.y+outer*Math.sin(b)}, {x:ring.center.x+inner*Math.cos(b),y:ring.center.y+inner*Math.sin(b)}, {x:ring.center.x+inner*Math.cos(a),y:ring.center.y+inner*Math.sin(a)}]
        polygons.push({layer:'1/0',width:cell.width,vertices:local.map(transform),valid:true})
      }
    } else if (cell.type === 'dc') {
      const dc = makeDirectionalCoupler(cell.width, cell.gap, cell.couplingLength, cell.transitionLength, cell.portPitch)
      if (!dc) throw new Error(`${cell.id}: invalid directional coupler`)
      dc.paths.forEach((path, index) => {
        const points = path.map(p => { const r = rotatePoint(p.x, p.y, cell.rotation); return {x: cell.x+r.x, y: cell.y+r.y} })
        polygons.push(...polygonParts(points, cell.width, `${cell.id}/guide${index+1}`))
      })
    } else polygons.push(...polygonParts(cellPoints(cell), cell.width, cell.id))
  }
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
