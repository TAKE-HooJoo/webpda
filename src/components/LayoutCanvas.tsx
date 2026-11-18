import { makeGratingCoupler } from '../models/gratingCoupler'
import { makeRingResonator } from '../models/ringResonator'
import { makeDirectionalCoupler } from '../models/directionalCoupler'
import { makeSBend } from '../models/sbend'
import { useRef, useState } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
import { type PCell, rotatePoint, worldPorts } from '../models/photonics'
import { type PortRef, samePort, type RouteConnection } from '../models/router'
import type { CSCResult } from '../models/dubins'
import { makeWaveguidePolygon } from '../models/waveguide'

type Props = {
  cells: PCell[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  startPort: PortRef | null
  endPort: PortRef | null
  onPortClick: (ref: PortRef) => void
  routes: { connection: RouteConnection; path: CSCResult | null }[]
}
type View = { x: number; y: number; width: number; height: number }
type Drag = { kind: 'cell'; id: string; dx: number; dy: number; pointerId: number } | { kind: 'pan'; x: number; y: number; view: View; pointerId: number }
const INITIAL: View = { x: 0, y: 0, width: 160, height: 100 }
const MIN_WIDTH = 5
const MAX_WIDTH = 2000

export default function LayoutCanvas({ cells, selectedId, onSelect, onMove, startPort, endPort, onPortClick, routes }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const [showPorts, setShowPorts] = useState(true)
  const [showPolygon, setShowPolygon] = useState(true)
  const [snap, setSnap] = useState(true)
  const [view, setView] = useState<View>(INITIAL)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  function position(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return null
    const matrix = svg.getScreenCTM()
    if (!matrix) return null
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const result = point.matrixTransform(matrix.inverse())
    return { x: result.x, y: result.y }
  }
  function zoom(factor: number, anchor?: { x: number; y: number }) {
    setView(v => {
      const center = anchor ?? { x: v.x + v.width / 2, y: v.y + v.height / 2 }
      const width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, v.width * factor))
      const ratio = width / v.width
      return { x: center.x - (center.x - v.x) * ratio, y: center.y - (center.y - v.y) * ratio, width, height: v.height * ratio }
    })
  }
  function wheel(e: WheelEvent<SVGSVGElement>) {
    e.preventDefault()
    const p = position(e.clientX, e.clientY)
    zoom(e.deltaY < 0 ? 0.9 : 1.1, p ?? undefined)
  }
  function fitView() {
    if (!cells.length) { setView(INITIAL); return }
    const points = [
      ...cells.flatMap(cell => [{ x: cell.x, y: cell.y }, ...worldPorts(cell).map(port => ({ x: port.x, y: port.y }))]),
      ...cells.flatMap(cell => {
        if (cell.type !== 'ring') return []
        const geometry = makeRingResonator(cell.width, cell.radius, cell.gap, cell.length)
        if (!geometry) return []
        return geometry.ring.map(point => {
          const rotated = rotatePoint(point.x, point.y, cell.rotation)
          return { x: cell.x + rotated.x, y: cell.y + rotated.y }
        })
      }),
      ...routes.flatMap(route => route.path?.points ?? []),
    ]
    const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x))
    const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y))
    const padding = 12
    const width = Math.max(20, maxX - minX + padding * 2)
    const height = Math.max(12.5, maxY - minY + padding * 2)
    const aspect = INITIAL.width / INITIAL.height
    const fittedWidth = Math.min(MAX_WIDTH, Math.max(width, height * aspect))
    const fittedHeight = fittedWidth / aspect
    setView({ x: (minX + maxX) / 2 - fittedWidth / 2, y: (minY + maxY) / 2 - fittedHeight / 2, width: fittedWidth, height: fittedHeight })
  }
  function startCellDrag(e: PointerEvent<SVGGElement>, cell: PCell) {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect(cell.id)
    const p = position(e.clientX, e.clientY)
    if (!p) return
    dragRef.current = { kind: 'cell', id: cell.id, dx: p.x - cell.x, dy: p.y - cell.y, pointerId: e.pointerId }
    svgRef.current?.setPointerCapture(e.pointerId)
  }
  function startPan(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0 && e.button !== 1) return
    onSelect(null)
    dragRef.current = { kind: 'pan', x: e.clientX, y: e.clientY, view, pointerId: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    const p = position(e.clientX, e.clientY)
    if (p) setCursor(p)
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    if (drag.kind === 'cell') {
      if (!p) return
      const x = p.x - drag.dx, y = p.y - drag.dy
      onMove(drag.id, snap ? Math.round(x) : x, snap ? Math.round(y) : y)
    } else {
      const svg = svgRef.current
      if (!svg) return
      const bounds = svg.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      setView({ ...drag.view, x: drag.view.x - (e.clientX - drag.x) * drag.view.width / bounds.width, y: drag.view.y - (e.clientY - drag.y) * drag.view.height / bounds.height })
    }
  }
  function endDrag(e: PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId !== e.pointerId) return
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  return <section className="canvas-pane">
    <div className="pane-title"><strong>Photonic Layout</strong><span className="toolbar">
      <button type="button" onClick={() => zoom(0.8)} title="Zoom in">＋</button>
      <button type="button" onClick={() => zoom(1.25)} title="Zoom out">－</button>
      <button type="button" onClick={fitView} title="Fit all PCells">Fit</button>
      <button type="button" onClick={() => setView(INITIAL)} title="Reset view">Reset</button>
      <label><input type="checkbox" checked={showPolygon} onChange={e => setShowPolygon(e.target.checked)}/> Polygon</label>
      <label><input type="checkbox" checked={showPorts} onChange={e => setShowPorts(e.target.checked)}/> Ports</label>
      <label><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)}/> Snap 1µm</label>
    </span></div>
    <svg ref={svgRef} className="layout-svg" viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} onWheel={wheel} onPointerDown={startPan} onPointerMove={move} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={() => setCursor(null)} aria-label="Photonic layout canvas" style={{ touchAction: 'none' }}>
      <defs><pattern id="webpda-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" fill="none" stroke="#334155" strokeWidth="0.12"/></pattern></defs>
      <rect x={view.x} y={view.y} width={view.width} height={view.height} fill="#101c30"/>
      <rect x={view.x} y={view.y} width={view.width} height={view.height} fill="url(#webpda-grid)"/>
      {routes.map(({ connection, path }) => {
        if (!path) return null
        const polygon = makeWaveguidePolygon(path.points, connection.width)
        return <g key={connection.id} pointerEvents="none">
          {showPolygon && polygon?.valid ? <polygon points={polygon.vertices.map(p => `${p.x},${p.y}`).join(' ')} fill="#a78bfa" stroke="#c4b5fd" strokeWidth="0.08"/> : null}
          {(!showPolygon || !polygon?.valid) && <polyline points={path.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={polygon && !polygon.valid ? '#fb7185' : '#a78bfa'} strokeWidth={Math.max(connection.width, 0.45)} strokeLinecap="butt" strokeLinejoin="round"/>}
        </g>
      })}
      {cells.map(cell => {
        const selected = selectedId === cell.id
        const gc = cell.type === 'gc' ? makeGratingCoupler(cell.width, cell.length, cell.period, cell.dutyCycle, cell.teethCount, cell.gratingWidth) : null
        const ring = cell.type === 'ring' ? makeRingResonator(cell.width, cell.radius, cell.gap, cell.length) : null
        const dc = cell.type === 'dc' ? makeDirectionalCoupler(cell.width, cell.gap, cell.couplingLength, cell.transitionLength, cell.portPitch) : null
        const sbend = cell.type === 'sbend' ? makeSBend(cell.length, cell.offset, cell.width) : null
        const path = cell.type === 'straight'
          ? `M 0 0 L ${cell.length} 0`
          : cell.type === 'sbend'
            ? (sbend ? sbend.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '')
            : cell.type === 'bend'
              ? `M 0 0 A ${cell.radius} ${cell.radius} 0 0 0 ${cell.radius} ${-cell.radius}`
              : ''
        const gcPaths = gc ? [gc.taper, ...gc.teeth].map(points => points.map((p,i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')+' Z') : []
        const paths = gc ? gcPaths : ring ? [ring.bus.map((p,i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '), ring.ring.map((p,i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'] : dc ? dc.paths.map(points => points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')) : path ? [path] : []
        return <g key={cell.id}>
          <g transform={`translate(${cell.x} ${cell.y}) rotate(${cell.rotation})`} onPointerDown={e => startCellDrag(e, cell)} onClick={e => { e.stopPropagation(); onSelect(cell.id) }} style={{ cursor: 'grab' }}>
            {gc && showPolygon && gcPaths.map((d,i) => <path key={`gc-${i}`} d={d} fill={selected ? '#5eead4' : '#22b8a6'} stroke='none'/>)}
            {(!gc || !showPolygon) && paths.map((d, i) => <g key={i}>
              <path d={d} fill="none" stroke="transparent" strokeWidth="5"/>
              <path d={d} fill="none" stroke={selected ? '#5eead4' : '#22b8a6'} strokeWidth={Math.max(cell.width, 0.45)} strokeLinecap="round"/>
            </g>)}
          </g>
          {showPorts && worldPorts(cell).map(port => {
            const ref = { cellId: cell.id, portName: port.name }
            const isStart = samePort(ref, startPort), isEnd = samePort(ref, endPort)
            const color = isStart ? '#fbbf24' : isEnd ? '#60a5fa' : '#f59e0b'
            const dir = rotatePoint(3, 0, port.angle)
            const tipX = port.x + dir.x, tipY = port.y + dir.y
            const wing1 = rotatePoint(-1.1, 0.55, port.angle), wing2 = rotatePoint(-1.1, -0.55, port.angle)
            return <g key={port.name} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onPortClick(ref) }} style={{ cursor: 'crosshair' }}>
              <circle cx={port.x} cy={port.y} r="3" fill="transparent"/>
              {(isStart || isEnd) && <circle cx={port.x} cy={port.y} r="2.1" fill="none" stroke={color} strokeWidth="0.55" pointerEvents="none"/>}
              <circle cx={port.x} cy={port.y} r="1.1" fill={color} stroke="#0f172a" strokeWidth="0.3" pointerEvents="none"/>
              <path d={`M ${port.x} ${port.y} L ${tipX} ${tipY} M ${tipX + wing1.x} ${tipY + wing1.y} L ${tipX} ${tipY} L ${tipX + wing2.x} ${tipY + wing2.y}`} stroke={color} fill="none" strokeWidth="0.45" pointerEvents="none"/>
              <text x={port.x + 1.5} y={port.y - 1.8} fontSize="2.1" fill="#f8fafc" pointerEvents="none">{port.name}</text>
            </g>
          })}
          <text x={cell.x} y={cell.y + 5} fontSize="2.6" fill={selected ? '#99f6e4' : '#cbd5e1'} pointerEvents="none">{cell.id}</text>
        </g>
      })}
    </svg>
    <div className="canvas-footer">Waveguide 1/0 · Optical Pin 2/0 · Units: µm · {cells.length} PCells · {cursor ? `X: ${cursor.x.toFixed(1)} Y: ${cursor.y.toFixed(1)} µm` : 'Move pointer for coordinates'}</div>
  </section>
}
