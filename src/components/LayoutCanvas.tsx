import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { type PCell, rotatePoint, worldPorts } from '../models/photonics'

type Props = { cells: PCell[]; selectedId: string | null; onSelect: (id: string | null) => void; onMove: (id: string, x: number, y: number) => void }
const VIEW = { width: 160, height: 100 }
export default function LayoutCanvas({ cells, selectedId, onSelect, onMove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const [showPorts, setShowPorts] = useState(true)
  const [snap, setSnap] = useState(true)
  function position(e: PointerEvent<SVGElement>) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    const result = pt.matrixTransform(matrix.inverse())
    return { x: result.x, y: result.y }
  }
  function startDrag(e: PointerEvent<SVGGElement>, cell: PCell) {
    e.stopPropagation(); onSelect(cell.id)
    const p = position(e)
    dragRef.current = { id: cell.id, dx: p.x - cell.x, dy: p.y - cell.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return
    const p = position(e); const d = dragRef.current
    const x = p.x - d.dx, y = p.y - d.dy
    onMove(d.id, snap ? Math.round(x) : x, snap ? Math.round(y) : y)
  }
  return <section className="canvas-pane">
    <div className="pane-title"><strong>Photonic Layout</strong><span className="toolbar"><label><input type="checkbox" checked={showPorts} onChange={e => setShowPorts(e.target.checked)}/> Ports</label><label><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)}/> Snap 1µm</label></span></div>
    <svg ref={svgRef} className="layout-svg" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} onPointerMove={move} onPointerUp={() => { dragRef.current = null }} onPointerCancel={() => { dragRef.current = null }} onClick={() => onSelect(null)} aria-label="Photonic layout canvas">
      <defs><pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" fill="none" stroke="#334155" strokeWidth="0.12"/></pattern></defs>
      <rect width="160" height="100" fill="#101c30"/><rect width="160" height="100" fill="url(#grid)"/>
      {cells.map(cell => {
        const selected = selectedId === cell.id
        const path = cell.type === 'straight' ? `M 0 0 L ${cell.length} 0` : `M 0 0 A ${cell.radius} ${cell.radius} 0 0 0 ${cell.radius} ${-cell.radius}`
        return <g key={cell.id}>
          <g transform={`translate(${cell.x} ${cell.y}) rotate(${cell.rotation})`} onPointerDown={e => startDrag(e, cell)} onClick={e => { e.stopPropagation(); onSelect(cell.id) }} style={{ cursor: 'grab' }}>
            <path d={path} fill="none" stroke="transparent" strokeWidth="5"/>
            <path d={path} fill="none" stroke={selected ? '#5eead4' : '#22b8a6'} strokeWidth={Math.max(cell.width, 0.45)} strokeLinecap="round"/>
          </g>
          {showPorts && worldPorts(cell).map(port => {
            const dir = rotatePoint(3, 0, port.angle)
            return <g key={port.name} pointerEvents="none"><circle cx={port.x} cy={port.y} r="1.1" fill="#fbbf24" stroke="#0f172a" strokeWidth="0.3"/><path d={`M ${port.x} ${port.y} l ${dir.x} ${dir.y}`} stroke="#fbbf24" strokeWidth="0.45"/><text x={port.x + 1.5} y={port.y - 1.8} fontSize="2.1" fill="#f8fafc">{port.name}</text></g>
          })}
          <text x={cell.x} y={cell.y + 5} fontSize="2.6" fill={selected ? '#99f6e4' : '#cbd5e1'} pointerEvents="none">{cell.id}</text>
        </g>
      })}
    </svg>
    <div className="canvas-footer">Waveguide 1/0 · Optical Pin 2/0 · Units: µm · {cells.length} PCells</div>
  </section>
}
