import assert from 'node:assert/strict'
import { calculateCSC } from '../src/models/dubins.ts'

const port = (x, y, angle) => ({ name: 'o1', x, y, angle, width: 0.5 })
const EPS_POS = 0.001
const EPS_ANGLE = 0.01
const R = 10
const cases = new Map()
let checked = 0

function check(start, end, radius, result) {
  assert.ok(result, 'CSC route must exist')
  assert.ok(Number.isFinite(result.length) && result.length >= 0)
  assert.ok(Math.abs(result.radius - radius) < 1e-12)
  assert.equal(result.segments.length, 3)
  assert.ok(result.endPositionError <= EPS_POS, `position error: ${result.endPositionError}`)
  assert.ok(result.endHeadingErrorDeg <= EPS_ANGLE, `heading error: ${result.endHeadingErrorDeg}`)
  assert.ok(Math.hypot(result.points[0].x - start.x, result.points[0].y - start.y) <= EPS_POS)
  const last = result.points.at(-1)
  assert.ok(Math.hypot(last.x - end.x, last.y - end.y) <= EPS_POS)
  const segmentLength = result.segments.reduce((sum, segment) => sum + segment.length, 0)
  assert.ok(Math.abs(result.length - segmentLength) < 1e-8)
  assert.ok(result.segments.every(segment => segment.length >= 0))
  checked++
}

// Start/End angles represent the outward-facing direction of the PCell port.
const start = port(0, 0, 0)
for (const x of [-40, -20, 0, 20, 40, 60]) {
  for (const y of [-40, -20, 0, 20, 40]) {
    for (const angle of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const end = port(x, y, angle)
      const result = calculateCSC(start, end, R)
      if (!result) continue // CSC-only solver can legitimately have no solution
      check(start, end, R, result)
      if (!cases.has(result.type)) cases.set(result.type, { x, y, angle, length: result.length })
    }
  }
}
for (const kind of ['LSL', 'RSR', 'LSR', 'RSL']) {
  assert.ok(cases.has(kind), `Missing representative route: ${kind}`)
}

// Straight aligned ports: heading into the destination is opposite its outward angle.
const straight = calculateCSC(port(0, 0, 0), port(15, 0, 180), R)
check(port(0, 0, 0), port(15, 0, 180), R, straight)
assert.ok(Math.abs(straight.length - 15) < 1e-7, `Straight length expected 15, got ${straight.length}`)
assert.ok(straight.segments[0].length < 1e-7 && straight.segments[2].length < 1e-7)

assert.equal(calculateCSC(start, port(20, 20, 180), 0), null)
assert.equal(calculateCSC(start, port(20, 20, 180), -1), null)
assert.equal(calculateCSC(start, port(20, 20, 180), Number.NaN), null)
assert.equal(calculateCSC(start, port(20, 20, 180), 10, 0), null)

console.log(`PASS: ${checked} CSC routes checked (endpoint, heading, length, radius parameter)`)
for (const [kind, value] of [...cases].sort()) {
  console.log(`${kind}: end=(${value.x}, ${value.y}), outward=${value.angle}°, length=${value.length.toFixed(3)} µm`)
}
console.log(`PASS: aligned straight route length=${straight.length.toFixed(3)} µm`)
console.log('PASS: invalid radius / sampling arguments rejected')
