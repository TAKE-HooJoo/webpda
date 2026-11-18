import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { code } = transformSync(readFileSync('src/models/directionalCoupler.ts', 'utf8'), {loader:'ts',format:'cjs'})
const mod = {exports:{}}
new Function('module','exports','require',code)(mod,mod.exports,require)
const {makeDirectionalCoupler: make} = mod.exports
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`)
test('four ports and geometry',()=>{
  const g=make();assert.ok(g);assert.equal(g.ports.length,4);close(g.totalLength,60)
  for (const path of g.paths) assert.ok(path.length>90)
  close(g.paths[0][0].y,-5);close(g.paths[1][0].y,5)
  close(g.paths[0].at(-1).y,-5);close(g.paths[1].at(-1).y,5)
})
test('edge gap is 0.2 um in coupling region',()=>{
  const g=make();const x=30
  const upper=g.paths[0].find(p=>Math.abs(p.x-x)<1e-8)
  // Evaluate central points using the transition/coupling boundary
  const a=g.paths[0].find(p=>p.x===20),b=g.paths[1].find(p=>p.x===20)
  close(b.y-a.y-g.width,0.2)
})
test('invalid inputs rejected',()=>{
  assert.equal(make(0),null);assert.equal(make(0.5,0),null)
  assert.equal(make(0.5,0.2,20,20,0.6),null)
  assert.equal(make(0.5,0.2,20,20,10,3),null)
})
