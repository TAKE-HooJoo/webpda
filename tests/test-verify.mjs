import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdtempSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

// TypeScript's built-in stripping does not rewrite extensionless imports.
// Bundle the verifier and its dependencies with the project's installed Vite/esbuild.
const root = process.cwd()
const out = join(mkdtempSync(join(tmpdir(), 'webpda-verify-')), 'verify.mjs')
execFileSync(join(root, 'node_modules/.bin/esbuild'), ['src/models/verify.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${out}`], { cwd: root, stdio: 'pipe' })
const { verifyPhotonicConnectivity } = await import(pathToFileURL(out).href)
const straight = (id, x, y, width = 0.5) => ({ id, type: 'straight', x, y, rotation: 0, width, length: 10, radius: 15 })
const route = (id = 'r1') => ({ id, start: { cellId: 'a', portName: 'o2' }, end: { cellId: 'b', portName: 'o1' }, width: 0.5, minRadius: 10 })
const cells = [straight('a', 0, 0), straight('b', 25, 0)]

test('valid straight connection and two intentional unconnected ports', () => {
  const r = verifyPhotonicConnectivity(cells, [route()])
  assert.equal(r.errors, 0)
  assert.equal(r.pass, 1)
  assert.equal(r.warnings, 2)
  assert.equal(r.valid, true)
})
test('missing port is error', () => {
  const r = verifyPhotonicConnectivity(cells, [{ ...route(), end: { cellId: 'missing', portName: 'o1' } }])
  assert(r.issues.some(i => i.code === 'MISSING_PORT'))
  assert.equal(r.valid, false)
})
test('width mismatch is error', () => {
  const r = verifyPhotonicConnectivity([cells[0], straight('b', 25, 0, 0.6)], [route()])
  assert(r.issues.some(i => i.code === 'WIDTH_MISMATCH'))
})
test('same port is error', () => {
  const r = verifyPhotonicConnectivity(cells, [{ ...route(), end: { cellId: 'a', portName: 'o2' } }])
  assert(r.issues.some(i => i.code === 'SAME_PORT'))
})
test('duplicate route IDs and multiply used ports are reported', () => {
  const r = verifyPhotonicConnectivity(cells, [route(), route()])
  assert(r.issues.some(i => i.code === 'DUPLICATE_ROUTE'))
  assert(r.issues.some(i => i.code === 'MULTIPLE_CONNECTIONS'))
})
test('no routes produces unconnected-port warnings, not errors', () => {
  const r = verifyPhotonicConnectivity(cells, [])
  assert.equal(r.errors, 0)
  assert.equal(r.warnings, 4)
})
