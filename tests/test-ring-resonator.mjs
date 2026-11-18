import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
const source=readFileSync(new URL('../src/models/ringResonator.ts',import.meta.url),'utf8')
const js=transformSync(source,{loader:'ts',format:'esm'}).code
const {makeRingResonator}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
test('all-pass ring has two ports and closed ring',()=>{const r=makeRingResonator();assert.ok(r);assert.equal(r.ports.length,2);assert.equal(r.ring.length,129);assert.ok(Math.abs(r.ring[0].x-r.ring.at(-1).x)<1e-9)})
test('edge-to-edge coupling gap is exact',()=>{const r=makeRingResonator();const edgeGap=(-r.center.y-r.radius-r.width);assert.ok(Math.abs(edgeGap-0.2)<1e-9)})
test('invalid inputs rejected',()=>{assert.equal(makeRingResonator(0),null);assert.equal(makeRingResonator(0.5,10,-1),null);assert.equal(makeRingResonator(0.5,10,0.2,10),null)})
