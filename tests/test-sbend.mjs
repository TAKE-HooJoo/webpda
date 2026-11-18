import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { pathToFileURL } from 'node:url'
const source = readFileSync(new URL('../src/models/sbend.ts', import.meta.url), 'utf8')
const compiled = transformSync(source, { loader: 'ts', format: 'esm' }).code
const { makeSBend } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
test('S-Bend endpoints and optical ports', () => {
  const g = makeSBend(40, 10, 0.5)
  assert.ok(g)
  assert.deepEqual(g.points[0], { x: 0, y: 0 })
  assert.ok(Math.abs(g.points.at(-1).x - 40) < 1e-10)
  assert.ok(Math.abs(g.points.at(-1).y - 10) < 1e-10)
  assert.deepEqual(g.ports.map(p => p.angle), [180, 0])
  assert.equal(g.points.length, 97)
})
test('minimum curvature radius and reverse offset', () => {
  const g = makeSBend(40, -10)
  assert.ok(g)
  assert.ok(Math.abs(g.minCurvatureRadius - 320 / Math.PI ** 2) < 1e-10)
  assert.ok(g.points[48].y < 0)
})
test('straight zero offset and invalid parameters', () => {
  assert.equal(makeSBend(40, 0).minCurvatureRadius, Infinity)
  assert.equal(makeSBend(0, 10), null)
  assert.equal(makeSBend(40, 10, -0.5), null)
  assert.equal(makeSBend(40, 10, 0.5, 2), null)
})
