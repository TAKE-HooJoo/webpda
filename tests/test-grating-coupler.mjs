import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import vm from 'node:vm'
const source = readFileSync(new URL('../src/models/gratingCoupler.ts', import.meta.url),'utf8')
const js = transformSync(source,{loader:'ts',format:'cjs'}).code
const module = {exports:{}}
vm.runInNewContext(js,{module,exports:module.exports})
const {makeGratingCoupler} = module.exports
test('geometry and single optical port',()=>{
 const g=makeGratingCoupler(0.5,20,0.64,0.5,20,12)
 assert.ok(g);assert.equal(g.teeth.length,20);assert.equal(g.ports.length,1)
 assert.equal(g.ports[0].angle,180);assert.equal(g.taper.length,4)
 assert.ok(Math.abs(g.teeth[0][1].x-g.teeth[0][0].x-0.32)<1e-9)
 assert.ok(Math.abs(g.teeth[1][0].x-g.teeth[0][0].x-0.64)<1e-9)
})
test('reject invalid inputs',()=>{
 assert.equal(makeGratingCoupler(0.5,20,0.64,1,20,12),null)
 assert.equal(makeGratingCoupler(0.5,20,0.64,0.5,2.5,12),null)
 assert.equal(makeGratingCoupler(0.5,20,0.64,0.5,20,0.3),null)
})
