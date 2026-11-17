import { type PCell, worldPorts } from './photonics'
import { type RouteConnection, resolvePort } from './router'
import { calculateCSC } from './dubins'
import { makeWaveguidePolygon } from './waveguide'

export type VerificationSeverity = 'PASS' | 'WARNING' | 'ERROR'
export type VerificationIssue = {
  severity: VerificationSeverity
  code: string
  subject: string
  message: string
}
export type VerificationReport = {
  issues: VerificationIssue[]
  pass: number
  warnings: number
  errors: number
  valid: boolean
}

const POSITION_TOL_UM = 0.001
const HEADING_TOL_DEG = 0.01
const WIDTH_TOL_UM = 0.001

/** Verify logical optical connections and calculated centerline/polygon geometry.
 * This is not GDS-level polygon connectivity, DRC, or photonic LVS.
 */
export function verifyPhotonicConnectivity(cells: PCell[], connections: RouteConnection[]): VerificationReport {
  const issues: VerificationIssue[] = []
  const push = (severity: VerificationSeverity, code: string, subject: string, message: string) =>
    issues.push({ severity, code, subject, message })

  const ids = new Set<string>()
  for (const cell of cells) {
    if (ids.has(cell.id)) push('ERROR', 'DUPLICATE_CELL', cell.id, 'Duplicate PCell ID')
    ids.add(cell.id)
  }

  const usedPorts = new Map<string, number>()
  const routeIds = new Set<string>()
  for (const route of connections) {
    if (routeIds.has(route.id)) push('ERROR', 'DUPLICATE_ROUTE', route.id, 'Duplicate route ID')
    routeIds.add(route.id)
    const keyA = `${route.start.cellId}/${route.start.portName}`
    const keyB = `${route.end.cellId}/${route.end.portName}`
    usedPorts.set(keyA, (usedPorts.get(keyA) ?? 0) + 1)
    usedPorts.set(keyB, (usedPorts.get(keyB) ?? 0) + 1)
    if (keyA === keyB) {
      push('ERROR', 'SAME_PORT', route.id, 'Start and End reference the same port')
      continue
    }
    const start = resolvePort(cells, route.start)
    const end = resolvePort(cells, route.end)
    if (!start || !end) {
      push('ERROR', 'MISSING_PORT', route.id, 'Referenced optical port does not exist')
      continue
    }
    if (![route.width, route.minRadius].every(Number.isFinite) || route.width <= 0 || route.minRadius <= 0) {
      push('ERROR', 'INVALID_ROUTE', route.id, 'Route width or minimum radius is invalid')
      continue
    }
    if (Math.abs(start.width - end.width) > WIDTH_TOL_UM || Math.abs(start.width - route.width) > WIDTH_TOL_UM) {
      push('ERROR', 'WIDTH_MISMATCH', route.id, `Port/route widths differ: ${start.width}, ${end.width}, ${route.width} µm`)
      continue
    }
    const path = calculateCSC(start, end, route.minRadius)
    if (!path) {
      push('ERROR', 'NO_CSC', route.id, 'No valid CSC route for current port positions')
      continue
    }
    if (path.endPositionError > POSITION_TOL_UM || path.endHeadingErrorDeg > HEADING_TOL_DEG) {
      push('ERROR', 'ENDPOINT_MISMATCH', route.id, `Endpoint error ${path.endPositionError} µm; heading error ${path.endHeadingErrorDeg}°`)
      continue
    }
    const polygon = makeWaveguidePolygon(path.points, route.width)
    if (!polygon || !polygon.valid) {
      push('ERROR', 'INVALID_POLYGON', route.id, polygon?.warning ?? 'Cannot generate valid waveguide polygon')
      continue
    }
    push('PASS', 'ROUTE_OK', route.id, `${path.type} ${path.length.toFixed(3)} µm; endpoint and polygon checks passed`)
  }

  for (const [port, count] of usedPorts) {
    if (count > 1) push('WARNING', 'MULTIPLE_CONNECTIONS', port, `${count} routes use this optical port`)
  }
  for (const cell of cells) {
    for (const port of worldPorts(cell)) {
      const key = `${cell.id}/${port.name}`
      if (!usedPorts.has(key)) push('WARNING', 'UNCONNECTED_PORT', key, 'No route connected (may be intentional I/O)')
    }
  }
  const pass = issues.filter(i => i.severity === 'PASS').length
  const warnings = issues.filter(i => i.severity === 'WARNING').length
  const errors = issues.filter(i => i.severity === 'ERROR').length
  return { issues, pass, warnings, errors, valid: errors === 0 }
}
