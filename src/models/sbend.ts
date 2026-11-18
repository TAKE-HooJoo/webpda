/** S-Bend centerline for WebPDA. Coordinates are local SVG units (µm, +Y down). */
export type SPoint = { x: number; y: number }
export type SBendGeometry = {
  points: SPoint[]
  length: number
  offset: number
  width: number
  minCurvatureRadius: number
  ports: { name: 'o1' | 'o2'; x: number; y: number; angle: number; width: number }[]
}

export function makeSBend(length: number, offset: number, width = 0.5, samples = 96): SBendGeometry | null {
  if (![length, offset, width, samples].every(Number.isFinite) || length <= 0 || width <= 0 ||
      !Number.isInteger(samples) || samples < 8 || samples > 4096) return null
  const points: SPoint[] = []
  for (let i = 0; i <= samples; i++) {
    const x = length * i / samples
    const y = offset * (1 - Math.cos(Math.PI * i / samples)) / 2
    points.push({ x, y })
  }
  // For y=A/2(1-cos(pi*x/L)), the maximum absolute curvature is
  // |A|*pi^2/(2*L^2), attained at both endpoints.
  const minCurvatureRadius = offset === 0 ? Infinity : 2 * length * length / (Math.PI * Math.PI * Math.abs(offset))
  return {
    points, length, offset, width, minCurvatureRadius,
    ports: [
      { name: 'o1', x: 0, y: 0, angle: 180, width },
      { name: 'o2', x: length, y: offset, angle: 0, width },
    ],
  }
}
