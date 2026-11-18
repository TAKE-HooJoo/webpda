/** Directional coupler with two independent cosine-transition waveguides.
 * Local coordinates in µm; +Y downward. gap is EDGE-TO-EDGE spacing.
 */
export type DCPoint = { x: number; y: number }
export type DCPort = { name: 'o1' | 'o2' | 'o3' | 'o4'; x: number; y: number; angle: number; width: number }
export type DCGeometry = {
  paths: [DCPoint[], DCPoint[]]
  ports: DCPort[]
  width: number
  gap: number
  couplingLength: number
  transitionLength: number
  portPitch: number
  totalLength: number
  minTransitionRadius: number
}
export function makeDirectionalCoupler(
  width = 0.5, gap = 0.2, couplingLength = 20,
  transitionLength = 20, portPitch = 10, samplesPerTransition = 48,
): DCGeometry | null {
  const values = [width, gap, couplingLength, transitionLength, portPitch, samplesPerTransition]
  if (!values.every(Number.isFinite) || width <= 0 || gap <= 0 || couplingLength <= 0 ||
      transitionLength <= 0 || portPitch <= width + gap ||
      !Number.isInteger(samplesPerTransition) || samplesPerTransition < 8 || samplesPerTransition > 2048) return null
  const nearPitch = width + gap
  const shift = (portPitch - nearPitch) / 2
  const totalLength = 2 * transitionLength + couplingLength
  function yAt(x: number, upper: boolean): number {
    const side = upper ? -1 : 1
    const start = side * portPitch / 2
    const middle = side * nearPitch / 2
    if (x <= transitionLength) {
      const t = x / transitionLength
      return start + (middle - start) * (1 - Math.cos(Math.PI * t)) / 2
    }
    if (x <= transitionLength + couplingLength) return middle
    const t = (x - transitionLength - couplingLength) / transitionLength
    return middle + (start - middle) * (1 - Math.cos(Math.PI * t)) / 2
  }
  const xs: number[] = []
  for (let i = 0; i <= samplesPerTransition; i++) xs.push(transitionLength * i / samplesPerTransition)
  xs.push(transitionLength + couplingLength)
  for (let i = 1; i <= samplesPerTransition; i++) xs.push(transitionLength + couplingLength + transitionLength * i / samplesPerTransition)
  const paths: [DCPoint[], DCPoint[]] = [xs.map(x => ({x, y: yAt(x,true)})), xs.map(x => ({x, y: yAt(x,false)}))]
  const ports: DCPort[] = [
    {name:'o1',x:0,y:-portPitch/2,angle:180,width},
    {name:'o2',x:totalLength,y:-portPitch/2,angle:0,width},
    {name:'o3',x:0,y:portPitch/2,angle:180,width},
    {name:'o4',x:totalLength,y:portPitch/2,angle:0,width},
  ]
  const minTransitionRadius = 2 * transitionLength ** 2 / (Math.PI ** 2 * shift)
  return {paths,ports,width,gap,couplingLength,transitionLength,portPitch,totalLength,minTransitionRadius}
}
