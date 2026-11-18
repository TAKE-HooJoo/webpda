/** Geometric (not optical-performance) model of a straight grating coupler. Units: µm. */
export type GCPoint = { x: number; y: number }
export type GCGeometry = {
  taper: GCPoint[]
  teeth: GCPoint[][]
  ports: { name: string; x: number; y: number; angle: number; width: number }[]
  totalLength: number
}
export function makeGratingCoupler(width: number, taperLength: number, period: number, dutyCycle: number, teethCount: number, gratingWidth: number): GCGeometry | null {
  if (![width, taperLength, period, dutyCycle, teethCount, gratingWidth].every(Number.isFinite) ||
      width <= 0 || taperLength <= 0 || period <= 0 || dutyCycle <= 0 || dutyCycle >= 1 ||
      !Number.isInteger(teethCount) || teethCount < 1 || teethCount > 200 || gratingWidth <= width ||
      period * dutyCycle < 0.001) return null
  const taper = [
    { x: 0, y: -width / 2 }, { x: taperLength, y: -gratingWidth / 2 },
    { x: taperLength, y: gratingWidth / 2 }, { x: 0, y: width / 2 },
  ]
  const teeth = Array.from({ length: teethCount }, (_, i) => {
    const x0 = taperLength + i * period
    const x1 = x0 + period * dutyCycle
    return [{x:x0,y:-gratingWidth/2},{x:x1,y:-gratingWidth/2},{x:x1,y:gratingWidth/2},{x:x0,y:gratingWidth/2}]
  })
  return { taper, teeth, ports: [{name:'o1',x:0,y:0,angle:180,width}], totalLength:taperLength + (teethCount-1)*period + period*dutyCycle }
}
