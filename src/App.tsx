import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import LayoutCanvas from './components/LayoutCanvas'
import { createPCell, isPCell, type PCell, type PCellType, worldPorts } from './models/photonics'
import { isRouteConnection, resolvePort, samePort, type PortRef, type RouteConnection } from './models/router'
import { calculateCSC, type CSCResult } from './models/dubins'
import './App.css'

const initial: PCell[] = [{ ...createPCell('straight', 1), x: 20, y: 65 }, { ...createPCell('bend', 2), x: 65, y: 65 }]
export default function App() {
  const [cells, setCells] = useState<PCell[]>(initial)
  const [selectedId, setSelectedId] = useState<string | null>(initial[0].id)
  const [message, setMessage] = useState('Ready. Click an optical port to choose Start.')
  const [startPort, setStartPort] = useState<PortRef | null>(null)
  const [endPort, setEndPort] = useState<PortRef | null>(null)
  const [connections, setConnections] = useState<RouteConnection[]>([])
  const [minRadius, setMinRadius] = useState(10)
  const fileRef = useRef<HTMLInputElement>(null)
  const selected = cells.find(c => c.id === selectedId)
  const start = resolvePort(cells, startPort), end = resolvePort(cells, endPort)
  const routed = useMemo(() => connections.map(connection => {
    const a = resolvePort(cells, connection.start)
    const b = resolvePort(cells, connection.end)
    const path: CSCResult | null = a && b ? calculateCSC(a, b, connection.minRadius) : null
    return { connection, path }
  }), [cells, connections])
  function add(type: PCellType) {
    const index = cells.length ? Math.max(...cells.map(c => Number(c.id.match(/\d+$/)?.[0] || 0))) + 1 : 1
    const cell = createPCell(type, index)
    setCells(prev => [...prev, cell]); setSelectedId(cell.id); setMessage(`Added ${cell.id}`)
  }
  function update(id: string, changes: Partial<PCell>) { setCells(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c)) }
  function remove() {
    if (!selectedId) return
    const id = selectedId
    setCells(prev => prev.filter(c => c.id !== id))
    setConnections(prev => prev.filter(c => c.start.cellId !== id && c.end.cellId !== id))
    if (startPort?.cellId === id) setStartPort(null)
    if (endPort?.cellId === id) setEndPort(null)
    setMessage(`Deleted ${id} and related connections`); setSelectedId(null)
  }
  function selectPort(ref: PortRef) {
    if (!startPort || endPort) {
      setStartPort(ref); setEndPort(null); setMessage(`Start: ${ref.cellId}/${ref.portName}. Select End.`)
    } else if (samePort(startPort, ref)) {
      setMessage('Start and End must be different ports.')
    } else {
      setEndPort(ref); setMessage(`End: ${ref.cellId}/${ref.portName}. Add connection to save.`)
    }
  }
  function addConnection() {
    if (!startPort || !endPort || !start || !end) return
    if (Math.abs(start.width - end.width) > 1e-6) { setMessage('Port width mismatch. Connection not added.'); return }
    const exists = connections.some(c => (samePort(c.start, startPort) && samePort(c.end, endPort)) || (samePort(c.start, endPort) && samePort(c.end, startPort)))
    if (exists) { setMessage('Connection already exists.'); return }
    const id = `route_${Math.max(0, ...connections.map(c => Number(c.id.match(/\d+$/)?.[0] ?? 0))) + 1}`
    setConnections(prev => [...prev, { id, start: startPort, end: endPort, width: start.width, minRadius }])
    setMessage(`Added ${id}; CSC geometry is calculated from live port positions`)
    setStartPort(null); setEndPort(null)
  }
  function save() {
    const data = { format: 'webpda-project', version: 1, units: 'um', pdk: { waveguideLayer: '1/0', opticalPinLayer: '2/0' }, cells, connections }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'webpda-project.json'; a.click(); URL.revokeObjectURL(url)
    setMessage('Project JSON exported')
  }
  async function load(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const data: unknown = JSON.parse(await file.text())
      if (!data || typeof data !== 'object') throw new Error('Invalid project')
      const project = data as Record<string, unknown>
      if (project.format !== 'webpda-project' || project.version !== 1 || !Array.isArray(project.cells) || !project.cells.every(isPCell)) throw new Error('Unsupported or invalid WebPDA project')
      const importedCells = project.cells as PCell[]
      if (new Set(importedCells.map(c => c.id)).size !== importedCells.length) throw new Error('Duplicate PCell IDs')
      const importedRoutes: RouteConnection[] = project.connections === undefined ? [] : Array.isArray(project.connections) && project.connections.every(isRouteConnection) ? project.connections : (() => { throw new Error('Invalid connections') })()
      if (new Set(importedRoutes.map(c => c.id)).size !== importedRoutes.length || importedRoutes.some(c => !resolvePort(importedCells, c.start) || !resolvePort(importedCells, c.end))) throw new Error('Invalid route references or duplicate route IDs')
      setCells(importedCells); setConnections(importedRoutes); setSelectedId(null); setStartPort(null); setEndPort(null)
      setMessage(`Loaded ${importedCells.length} PCells and ${importedRoutes.length} connections`)
    } catch (error) { setMessage(`Import failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`) }
    e.target.value = ''
  }
  const portText = (ref: PortRef | null) => {
    const p = resolvePort(cells, ref)
    return ref && p ? `${ref.cellId}/${ref.portName} · (${p.x.toFixed(2)}, ${p.y.toFixed(2)}) µm · ${p.angle}° · W ${p.width} µm` : 'Not selected'
  }
  return <div className="app-shell">
    <header className="topbar"><div><strong className="brand">◈ WebPDA</strong><span className="subtitle">Photonic Design Automation · Ver.1</span></div><div className="header-actions"><button onClick={() => fileRef.current?.click()}>Open JSON</button><button className="primary" onClick={save}>Save JSON</button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={load}/></div></header>
    <nav className="steps">{['1 Circuit','2 Layout','3 Verify','4 Export'].map((step, i) => <div className={i === 1 ? 'active' : ''} key={step}>{step}{i !== 1 && <small>Future</small>}</div>)}</nav>
    <main className="workspace">
      <aside className="sidebar"><h2>PCell Library</h2><p className="muted">Click to add a photonic component.</p><button className="library-item" onClick={() => add('straight')}><span className="glyph">━</span><span><strong>Straight</strong><small>Waveguide</small></span><span>＋</span></button><button className="library-item" onClick={() => add('bend')}><span className="glyph">╰</span><span><strong>Bend 90°</strong><small>Quarter-circle</small></span><span>＋</span></button><hr/><h2>Instances</h2><div className="instances">{cells.map(c => <button key={c.id} className={c.id === selectedId ? 'instance selected' : 'instance'} onClick={() => setSelectedId(c.id)}>{c.id}</button>)}</div></aside>
      <LayoutCanvas cells={cells} selectedId={selectedId} onSelect={setSelectedId} onMove={(id,x,y) => update(id,{x,y})} startPort={startPort} endPort={endPort} onPortClick={selectPort} routes={routed}/>
      <aside className="properties"><h2>Properties</h2>{selected ? <><p className="selected-name">{selected.id}</p><p className="muted">{selected.type === 'straight' ? 'Straight Waveguide' : '90° Circular Bend'}</p><div className="fields">{(['x','y','rotation','width',selected.type === 'straight' ? 'length' : 'radius'] as const).map(key => <label key={key}><span>{key === 'rotation' ? 'Rotation (°)' : `${key[0].toUpperCase()+key.slice(1)} (µm)`}</span><input type="number" step={key === 'rotation' ? 90 : 0.5} min={key === 'width' ? 0.01 : key === 'length' || key === 'radius' ? 0.1 : undefined} value={selected[key]} onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v) && (!['width','length','radius'].includes(key) || v > 0)) update(selected.id, { [key]: v }) }}/></label>)}</div><div className="property-actions"><button onClick={() => update(selected.id, { rotation: (selected.rotation + 90) % 360 })}>Rotate +90°</button><button className="danger" onClick={remove}>Delete</button></div><h3>Optical Ports</h3>{worldPorts(selected).map(port => <div className="port-info" key={port.name}><strong>{port.name}</strong><span>({port.x.toFixed(2)}, {port.y.toFixed(2)}) µm</span><small>Direction: {port.angle}° · Width: {port.width} µm</small></div>)}</> : <p className="muted">Select a PCell to edit its properties.</p>}
      <hr/><h2>Optical Router · 3.2</h2><p className="muted">Select Start and End ports, then Add connection to generate a CSC centerline.</p>
      <div className="port-info"><strong style={{color:'#fbbf24'}}>Start</strong><small>{portText(startPort)}</small></div>
      <div className="port-info"><strong style={{color:'#60a5fa'}}>End</strong><small>{portText(endPort)}</small></div>
      <div className="fields"><label><span>Minimum radius (µm)</span><input type="number" min="0.1" step="0.5" value={minRadius} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n > 0) setMinRadius(n) }}/></label></div>
      <div className="property-actions"><button disabled={!start || !end} onClick={addConnection}>Add connection</button><button onClick={() => { setStartPort(null); setEndPort(null); setMessage('Port selection cleared') }}>Clear</button></div>
      <h3>Connections ({connections.length})</h3>{routed.map(({ connection: c, path }) => <div className="port-info" key={c.id}><strong>{c.id}</strong><small>{c.start.cellId}/{c.start.portName} → {c.end.cellId}/{c.end.portName}</small><small>Width {c.width} µm · Rmin {c.minRadius} µm</small>{path ? <><small>CSC: {path.type} · Length: {path.length.toFixed(3)} µm</small><small>Endpoint error: {path.endPositionError.toExponential(2)} µm · Heading error: {path.endHeadingErrorDeg.toExponential(2)}°</small></> : <small style={{ color: '#f87171' }}>No valid CSC route</small>}<button type="button" onClick={() => setConnections(prev => prev.filter(r => r.id !== c.id))}>Remove</button></div>)}
      </aside>
    </main><footer className="statusbar"><span>● {message}</span><span>STEP 3.2 · CSC routing preview · No obstacle avoidance or LVS yet</span></footer>
  </div>
}
