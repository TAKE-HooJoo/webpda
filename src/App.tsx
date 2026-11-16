import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import LayoutCanvas from './components/LayoutCanvas'
import { createPCell, isPCell, type PCell, type PCellType, worldPorts } from './models/photonics'
import './App.css'

const initial: PCell[] = [{ ...createPCell('straight', 1), x: 20, y: 65 }, { ...createPCell('bend', 2), x: 65, y: 65 }]
export default function App() {
  const [cells, setCells] = useState<PCell[]>(initial)
  const [selectedId, setSelectedId] = useState<string | null>(initial[0].id)
  const [message, setMessage] = useState('Ready. Select a PCell or add a new one.')
  const fileRef = useRef<HTMLInputElement>(null)
  const selected = cells.find(c => c.id === selectedId)
  function add(type: PCellType) {
    const index = cells.length ? Math.max(...cells.map(c => Number(c.id.match(/\d+$/)?.[0] || 0))) + 1 : 1
    const cell = createPCell(type, index)
    setCells(prev => [...prev, cell]); setSelectedId(cell.id); setMessage(`Added ${cell.id}`)
  }
  function update(id: string, changes: Partial<PCell>) { setCells(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c)) }
  function remove() { if (!selectedId) return; setCells(prev => prev.filter(c => c.id !== selectedId)); setMessage(`Deleted ${selectedId}`); setSelectedId(null) }
  function save() {
    const data = { format: 'webpda-project', version: 1, units: 'um', pdk: { waveguideLayer: '1/0', opticalPinLayer: '2/0' }, cells }
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
      const ids = project.cells.map((c: PCell) => c.id)
      if (new Set(ids).size !== ids.length) throw new Error('Duplicate PCell IDs')
      setCells(project.cells); setSelectedId(null); setMessage(`Loaded ${project.cells.length} PCells`)
    } catch (error) { setMessage(`Import failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`) }
    e.target.value = ''
  }
  return <div className="app-shell">
    <header className="topbar"><div><strong className="brand">◈ WebPDA</strong><span className="subtitle">Photonic Design Automation · Ver.1</span></div><div className="header-actions"><button onClick={() => fileRef.current?.click()}>Open JSON</button><button className="primary" onClick={save}>Save JSON</button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={load}/></div></header>
    <nav className="steps">{['1 Circuit','2 Layout','3 Verify','4 Export'].map((step, i) => <div className={i === 1 ? 'active' : ''} key={step}>{step}{i !== 1 && <small>Future</small>}</div>)}</nav>
    <main className="workspace">
      <aside className="sidebar"><h2>PCell Library</h2><p className="muted">Click to add a photonic component.</p><button className="library-item" onClick={() => add('straight')}><span className="glyph">━</span><span><strong>Straight</strong><small>Waveguide</small></span><span>＋</span></button><button className="library-item" onClick={() => add('bend')}><span className="glyph">╰</span><span><strong>Bend 90°</strong><small>Quarter-circle</small></span><span>＋</span></button><hr/><h2>Instances</h2><div className="instances">{cells.map(c => <button key={c.id} className={c.id === selectedId ? 'instance selected' : 'instance'} onClick={() => setSelectedId(c.id)}>{c.id}</button>)}</div></aside>
      <LayoutCanvas cells={cells} selectedId={selectedId} onSelect={setSelectedId} onMove={(id,x,y) => update(id,{x,y})}/>
      <aside className="properties"><h2>Properties</h2>{selected ? <><p className="selected-name">{selected.id}</p><p className="muted">{selected.type === 'straight' ? 'Straight Waveguide' : '90° Circular Bend'}</p><div className="fields">{(['x','y','rotation','width',selected.type === 'straight' ? 'length' : 'radius'] as const).map(key => <label key={key}><span>{key === 'rotation' ? 'Rotation (°)' : `${key[0].toUpperCase()+key.slice(1)} (µm)`}</span><input type="number" step={key === 'rotation' ? 90 : 0.5} min={key === 'width' ? 0.01 : key === 'length' || key === 'radius' ? 0.1 : undefined} value={selected[key]} onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v) && (!['width','length','radius'].includes(key) || v > 0)) update(selected.id, { [key]: v }) }}/></label>)}</div><div className="property-actions"><button onClick={() => update(selected.id, { rotation: (selected.rotation + 90) % 360 })}>Rotate +90°</button><button className="danger" onClick={remove}>Delete</button></div><h3>Optical Ports</h3>{worldPorts(selected).map(port => <div className="port-info" key={port.name}><strong>{port.name}</strong><span>({port.x.toFixed(2)}, {port.y.toFixed(2)}) µm</span><small>Direction: {port.angle}° · Width: {port.width} µm</small></div>)}</> : <p className="muted">Select a PCell to edit its properties.</p>}</aside>
    </main><footer className="statusbar"><span>● {message}</span><span>STEP 2 · Editor prototype · No routing or LVS yet</span></footer>
  </div>
}
