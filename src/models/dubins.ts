import type { Port } from './photonics'

export type CSCType = 'LSL' | 'RSR' | 'LSR' | 'RSL'
export type RoutePoint = { x: number; y: number }
export type CSCResult = {
  type: CSCType
  length: number
  radius: number
  points: RoutePoint[]
  segments: { kind: 'arc' | 'straight'; length: number }[]
  endPositionError: number
  endHeadingErrorDeg: number
}

type Pose = { x: number; y: number; heading: number }
const TAU = 2 * Math.PI
const mod = (a: number) => ((a % TAU) + TAU) % TAU
const clamp = (x: number) => Math.max(-1, Math.min(1, x))

// Dubins formulas use a Cartesian coordinate system (positive Y upward).
// WebPDA SVG coordinates have positive Y downward, so Y and headings are inverted.
function candidate(kind: CSCType, alpha: number, beta: number, d: number): [number, number, number] | null {
  const sa = Math.sin(alpha), sb = Math.sin(beta)
  const ca = Math.cos(alpha), cb = Math.cos(beta)
  const cab = Math.cos(alpha - beta)
  let p2: number, tmp: number, t: number, p: number, q: number
  switch (kind) {
    case 'LSL':
      p2 = 2 + d*d - 2*cab + 2*d*(sa-sb)
      if (p2 < -1e-9) return null
      p = Math.sqrt(Math.max(0,p2))
      tmp = Math.atan2(cb-ca, d+sa-sb)
      t = mod(-alpha+tmp); q = mod(beta-tmp)
      break
    case 'RSR':
      p2 = 2 + d*d - 2*cab + 2*d*(sb-sa)
      if (p2 < -1e-9) return null
      p = Math.sqrt(Math.max(0,p2))
      tmp = Math.atan2(ca-cb, d-sa+sb)
      t = mod(alpha-tmp); q = mod(-beta+tmp)
      break
    case 'LSR':
      p2 = -2 + d*d + 2*cab + 2*d*(sa+sb)
      if (p2 < -1e-9) return null
      p = Math.sqrt(Math.max(0,p2))
      tmp = Math.atan2(-ca-cb, d+sa+sb) - Math.atan2(-2,p)
      t = mod(-alpha+tmp); q = mod(-beta+tmp)
      break
    case 'RSL':
      p2 = -2 + d*d + 2*cab - 2*d*(sa+sb)
      if (p2 < -1e-9) return null
      p = Math.sqrt(Math.max(0,p2))
      tmp = Math.atan2(ca+cb, d-sa-sb) - Math.atan2(2,p)
      t = mod(alpha-tmp); q = mod(beta-tmp)
      break
  }
  return [t,p,q]
}

function advance(pose: Pose, kind: 'L'|'R'|'S', distance: number, radius: number): Pose {
  if (kind === 'S') return { x: pose.x+distance*Math.cos(pose.heading), y: pose.y+distance*Math.sin(pose.heading), heading: pose.heading }
  const sign = kind === 'L' ? 1 : -1
  const h2 = pose.heading + sign*distance/radius
  return { x: pose.x + sign*radius*(Math.sin(h2)-Math.sin(pose.heading)), y: pose.y-sign*radius*(Math.cos(h2)-Math.cos(pose.heading)), heading: h2 }
}

/** Calculate shortest valid CSC centerline. Returns null when no CSC solution exists. */
export function calculateCSC(start: Port, end: Port, radius: number, sampleStep = 0.5): CSCResult | null {
  if (![start.x,start.y,start.angle,end.x,end.y,end.angle,radius,sampleStep].every(Number.isFinite) || radius <= 0 || sampleStep <= 0) return null
  const sx = start.x, sy = -start.y
  const ex = end.x, ey = -end.y
  const sh = -start.angle*Math.PI/180
  const eh = -(end.angle+180)*Math.PI/180
  const dx = ex-sx, dy = ey-sy
  const distance = Math.hypot(dx,dy)
  const theta = distance < 1e-12 ? 0 : Math.atan2(dy,dx)
  const alpha = mod(sh-theta), beta = mod(eh-theta), d = distance/radius
  const kinds: CSCType[] = ['LSL','RSR','LSR','RSL']
  const solutions = kinds.map(type => ({type, params: candidate(type,alpha,beta,d)})).filter((v): v is {type:CSCType;params:[number,number,number]} => v.params !== null)
  solutions.sort((a,b) => a.params.reduce((s,v)=>s+v,0)-b.params.reduce((s,v)=>s+v,0))
  for (const sol of solutions) {
    const [a,b,c] = sol.params
    const segmentKinds = [sol.type[0], 'S', sol.type[2]] as ('L'|'R'|'S')[]
    const lengths = [a*radius,b*radius,c*radius]
    const points: RoutePoint[] = [{x:sx,y:-sy}]
    let pose: Pose = {x:sx,y:sy,heading:sh}
    for (let i=0;i<3;i++) {
      const segmentStart = pose
      const count = Math.max(1,Math.ceil(lengths[i]/sampleStep))
      for(let j=1;j<=count;j++) {
        const next = advance(segmentStart,segmentKinds[i],lengths[i]*j/count,radius)
        points.push({x:next.x,y:-next.y})
      }
      pose = advance(segmentStart,segmentKinds[i],lengths[i],radius)
    }
    const positionError = Math.hypot(pose.x-ex,pose.y-ey)
    const headingError = Math.acos(clamp(Math.cos(pose.heading-eh)))*180/Math.PI
    if (positionError > 1e-5 || headingError > 1e-5) continue
    return {type:sol.type,length:lengths.reduce((s,v)=>s+v,0),radius,points,
      segments:lengths.map((length,i)=>({kind:i===1?'straight' as const:'arc' as const,length})),
      endPositionError:positionError,endHeadingErrorDeg:headingError}
  }
  return null
}
