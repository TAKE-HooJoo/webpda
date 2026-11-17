import assert from 'node:assert/strict'
import { makeWaveguidePolygon } from '../src/models/waveguide.ts'

const near = (actual, expected, tol = 1e-6) => assert.ok(Math.abs(actual - expected) <= tol, `${actual} != ${expected}`)
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)
const checkEnds = (poly, start, end, width) => {
  const n = poly.vertices.length / 2
  const left = poly.vertices.slice(0,n)
  const right = poly.vertices.slice(n).reverse()
  near(dist(left[0],right[0]),width)
  near(dist(left.at(-1),right.at(-1)),width)
  near((left[0].x+right[0].x)/2,start.x)
  near((left[0].y+right[0].y)/2,start.y)
  near((left.at(-1).x+right.at(-1).x)/2,end.x)
  near((left.at(-1).y+right.at(-1).y)/2,end.y)
}
const straight = [{x:0,y:0},{x:15,y:0}]
const p = makeWaveguidePolygon(straight,0.5)
assert.ok(p?.valid, p?.warning)
assert.equal(p.layer,'1/0')
assert.equal(p.vertices.length,4)
checkEnds(p,straight[0],straight[1],0.5)
console.log('PASS: straight 15 µm / width 0.5 µm / endpoint caps')

const r=10, arc=Array.from({length:101},(_,i)=>{const a=(Math.PI/2)*i/100;return {x:r*Math.sin(a),y:r*(1-Math.cos(a))}})
const q=makeWaveguidePolygon(arc,0.5)
assert.ok(q?.valid,q?.warning)
checkEnds(q,arc[0],arc.at(-1),0.5)
console.log('PASS: quarter-circle R=10 µm / endpoint caps')

assert.equal(makeWaveguidePolygon(straight,0),null)
assert.equal(makeWaveguidePolygon(straight,Number.NaN),null)
assert.equal(makeWaveguidePolygon([{x:0,y:0}],0.5),null)
assert.equal(makeWaveguidePolygon([{x:0,y:0},{x:Infinity,y:0}],0.5),null)
console.log('PASS: invalid input rejected')

const repeated=[{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:15,y:0}]
const dup=makeWaveguidePolygon(repeated,0.5)
assert.ok(dup?.valid,dup?.warning)
assert.equal(dup.vertices.length,4)
console.log('PASS: consecutive duplicate points')

const reversed=makeWaveguidePolygon([{x:0,y:0},{x:10,y:0},{x:0,y:0}],0.5)
assert.ok(reversed && !reversed.valid,'180-degree reversal must be rejected')
console.log('PASS: 180-degree reversal rejected')
