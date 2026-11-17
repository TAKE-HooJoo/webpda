import type { RoutePoint } from './dubins'

export type WaveguidePolygon = { layer: '1/0'; width: number; vertices: RoutePoint[]; valid: boolean; warning?: string }
const EPS = 1e-9
const cross = (a: RoutePoint, b: RoutePoint) => a.x * b.y - a.y * b.x
const sub = (a: RoutePoint, b: RoutePoint) => ({ x: a.x - b.x, y: a.y - b.y })
const add = (a: RoutePoint, b: RoutePoint) => ({ x: a.x + b.x, y: a.y + b.y })
const mul = (a: RoutePoint, s: number) => ({ x: a.x * s, y: a.y * s })
const distance = (a: RoutePoint, b: RoutePoint) => Math.hypot(a.x - b.x, a.y - b.y)

function intersects(a: RoutePoint, b: RoutePoint, c: RoutePoint, d: RoutePoint): boolean {
  const ab = sub(b, a), cd = sub(d, c), ac = sub(c, a)
  const denom = cross(ab, cd)
  if (Math.abs(denom) < EPS) return false
  const t = cross(ac, cd) / denom, u = cross(ac, ab) / denom
  return t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS
}

/** Approximate a constant-width waveguide by offsetting a sampled centerline.
 * Miter joins are limited; rejected shapes must NOT be exported as fabrication geometry.
 */
export function makeWaveguidePolygon(points: RoutePoint[], width: number): WaveguidePolygon | null {
  if (!Number.isFinite(width) || width <= 0 || points.length < 2 ||
      points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null
  const clean = points.filter((p, i) => i === 0 || distance(p, points[i - 1]) > EPS)
  if (clean.length < 2) return null
  const half = width / 2
  const normals: RoutePoint[] = []
  for (let i = 0; i < clean.length - 1; i++) {
    const v = sub(clean[i + 1], clean[i]); const len = Math.hypot(v.x, v.y)
    normals.push({ x: -v.y / len, y: v.x / len })
  }
  const left: RoutePoint[] = [], right: RoutePoint[] = []
  let warning: string | undefined
  for (let i = 0; i < clean.length; i++) {
    let offset: RoutePoint
    if (i === 0) offset = mul(normals[0], half)
    else if (i === clean.length - 1) offset = mul(normals[normals.length - 1], half)
    else {
      const a = normals[i - 1], b = normals[i]
      const sum = add(a, b)
      const dot = sum.x * b.x + sum.y * b.y
      if (Math.abs(dot) < 1e-5) {
        warning = 'Sharp reversal in centerline'; offset = mul(b, half)
      } else {
        const miter = mul(sum, half / dot)
        if (Math.hypot(miter.x, miter.y) > half * 4) warning = 'Excessive miter at a sharp corner'
        offset = miter
      }
    }
    left.push(add(clean[i], offset))
    right.push(sub(clean[i], offset))
  }
  const vertices = [...left, ...right.reverse()]
  if (vertices.length > 5000) warning = 'Too many vertices for polygon validation'
  else {
    const n = vertices.length
    outer: for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue
        if (intersects(vertices[i], vertices[(i + 1) % n], vertices[j], vertices[(j + 1) % n])) {
          warning = 'Self-intersecting waveguide polygon'; break outer
        }
      }
    }
  }
  return { layer: '1/0', width, vertices, valid: !warning, warning }
}
