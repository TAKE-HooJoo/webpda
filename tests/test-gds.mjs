import assert from 'node:assert/strict'
import { exportWaveguidesGDS } from '../src/models/gds.ts'
const rectangle = { layer: '1/0', width: 0.5, valid: true, vertices: [
  {x:0,y:-0.25}, {x:15,y:-0.25}, {x:15,y:0.25}, {x:0,y:0.25},
] }
const bytes = exportWaveguidesGDS([rectangle])
let pos = 0
const records = []
while (pos < bytes.length) {
  const length = bytes[pos] * 256 + bytes[pos + 1]
  assert.ok(length >= 4 && length % 2 === 0 && pos + length <= bytes.length)
  records.push({ type: bytes[pos + 2], datatype: bytes[pos + 3], payload: bytes.subarray(pos + 4, pos + length) })
  pos += length
}
assert.equal(pos, bytes.length)
assert.deepEqual(records.map(r => r.type), [0,1,2,3,5,6,8,13,14,16,17,7,4])
const xy = records.find(r => r.type === 16).payload
const coords = []
const view = new DataView(xy.buffer, xy.byteOffset, xy.byteLength)
for (let i = 0; i < xy.length; i += 8) coords.push([view.getInt32(i), view.getInt32(i + 4)])
assert.deepEqual(coords, [[0,-250],[15000,-250],[15000,250],[0,250],[0,-250]])
assert.throws(() => exportWaveguidesGDS([{...rectangle, valid:false}]))
assert.throws(() => exportWaveguidesGDS([{...rectangle, vertices: Array.from({length:201}, (_,i)=>({x:i,y:Math.sin(i)}))}]))
assert.throws(() => exportWaveguidesGDS([]))
console.log('PASS: GDSII records, layer 1/0, 1 nm DBU, closed XY, invalid geometry rejected')
