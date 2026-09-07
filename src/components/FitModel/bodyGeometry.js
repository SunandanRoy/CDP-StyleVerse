// Parametric 2D body-silhouette geometry. One master (front-view) contour is
// generated per archetype from body-shape multipliers; the "side" and
// "three-quarter" views are produced from that same master by the FitModel
// component via CSS transform (scaleX crossfade), per the interaction spec —
// so we only need one clean vector per archetype, not three hand-drawn ones.

export const ARCHETYPE_BODY_PARAMS = {
  arch_petite_slim: { shoulder: 0.88, bust: 0.85, waist: 0.82, hip: 0.88, legLen: 0.86, label: 'Petite Slim' },
  arch_petite_curvy: { shoulder: 0.9, bust: 1.02, waist: 0.98, hip: 1.08, legLen: 0.86, label: 'Petite Curvy' },
  arch_regular_slim: { shoulder: 0.96, bust: 0.92, waist: 0.86, hip: 0.94, legLen: 1.0, label: 'Regular Slim' },
  arch_regular_athletic: { shoulder: 1.08, bust: 0.98, waist: 0.88, hip: 0.96, legLen: 1.0, label: 'Regular Athletic' },
  arch_regular_curvy: { shoulder: 0.98, bust: 1.12, waist: 1.08, hip: 1.2, legLen: 1.0, label: 'Regular Curvy' },
  arch_tall_slim: { shoulder: 0.98, bust: 0.9, waist: 0.84, hip: 0.92, legLen: 1.16, label: 'Tall Slim' },
  arch_tall_athletic: { shoulder: 1.12, bust: 1.0, waist: 0.88, hip: 0.98, legLen: 1.16, label: 'Tall Athletic' },
  arch_plus_curvy: { shoulder: 1.05, bust: 1.28, waist: 1.3, hip: 1.36, legLen: 0.98, label: 'Plus Curvy' },
  arch_plus_straight: { shoulder: 1.08, bust: 1.22, waist: 1.28, hip: 1.22, legLen: 0.98, label: 'Plus Straight' },
  arch_broad_athletic: { shoulder: 1.24, bust: 1.1, waist: 0.92, hip: 0.98, legLen: 1.1, label: 'Broad Shoulder Athletic' }
}

// Catmull-Rom -> cubic Bezier, for a smooth silhouette from a sparse point list.
export function smoothPath(points, close = false) {
  if (points.length < 2) return ''
  const pts = close ? [points[points.length - 1], ...points, points[0], points[1]] : [points[0], ...points, points[points.length - 1]]
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} `
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += `C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `
  }
  if (close) d += 'Z'
  return d
}

export const CX = 100
export const Y = { neck: 58, shoulder: 78, bust: 118, waist: 176, hip: 210, crotch: 226, knee: 300, ankle: 384 }

export function bodyLevels(params) {
  const { shoulder, bust, waist, hip, legLen = 1 } = params
  const kneeY = Y.crotch + (Y.knee - Y.crotch) * legLen
  const ankleY = Y.crotch + (Y.ankle - Y.crotch) * legLen
  return {
    neckHW: 9,
    shoulderHW: 32 * shoulder,
    bustHW: 27 * bust,
    waistHW: 20 * waist,
    hipHW: 31 * hip,
    thighHW: 15 * ((hip + waist) / 2),
    ankleHW: 7,
    kneeY,
    ankleY
  }
}

export function torsoContourPoints(params) {
  const L = bodyLevels(params)
  const cx = CX
  // Left-side contour, neck -> shoulder -> bust -> waist -> hip -> crotch
  const left = [
    { x: cx - L.neckHW, y: Y.neck },
    { x: cx - L.shoulderHW, y: Y.shoulder },
    { x: cx - L.bustHW, y: Y.bust },
    { x: cx - L.waistHW, y: Y.waist },
    { x: cx - L.hipHW, y: Y.hip },
    { x: cx - L.hipHW * 0.62, y: Y.crotch }
  ]
  const right = left.map((p) => ({ x: 2 * cx - p.x, y: p.y })).reverse()
  return { left, right, closed: [...left, ...right], levels: L }
}

export function buildSilhouette(archetypeId) {
  const params = ARCHETYPE_BODY_PARAMS[archetypeId] || ARCHETYPE_BODY_PARAMS.arch_regular_slim
  const { left, right, closed, levels: L } = torsoContourPoints(params)
  const torsoPath = smoothPath(closed, true)

  const headR = 21
  const headCy = 34
  const headCx = CX

  const legTop = Y.crotch
  const legGap = 6
  const legLeft = [
    { x: CX - L.hipHW * 0.62 + legGap * 0.2, y: legTop },
    { x: CX - L.thighHW * 0.9 + legGap * 0.1, y: legTop + (L.kneeY - legTop) * 0.5 },
    { x: CX - L.thighHW * 0.75 + legGap * 0.1, y: L.kneeY },
    { x: CX - L.ankleHW + legGap * 0.1, y: L.ankleY }
  ]
  const legLeftOuter = [
    { x: CX - L.hipHW * 0.62, y: legTop },
    { x: CX - L.thighHW, y: legTop + (L.kneeY - legTop) * 0.5 },
    { x: CX - L.thighHW * 0.85, y: L.kneeY },
    { x: CX - L.ankleHW - 3, y: L.ankleY }
  ]
  const legLeftPoints = [...legLeftOuter, ...[...legLeft].reverse()]
  const legLeftPath = smoothPath(legLeftPoints, true)
  const legRightPath = smoothPath(legLeftPoints.map((p) => ({ x: 2 * CX - p.x, y: p.y })), true)

  const footY = L.ankleY + 14
  const feet = {
    left: `M ${CX - L.ankleHW - 4} ${L.ankleY} Q ${CX - L.ankleHW - 14} ${footY} ${CX - L.ankleHW + 2} ${footY} L ${CX - L.ankleHW + 6} ${L.ankleY} Z`,
    right: `M ${CX + L.ankleHW + 4} ${L.ankleY} Q ${CX + L.ankleHW + 14} ${footY} ${CX + L.ankleHW - 2} ${footY} L ${CX + L.ankleHW - 6} ${L.ankleY} Z`
  }

  const armWidth = 8 * params.shoulder
  const armLeftPath = smoothPath(
    [
      { x: CX - L.shoulderHW + 4, y: Y.shoulder - 2 },
      { x: CX - L.shoulderHW - armWidth, y: Y.shoulder + 40 },
      { x: CX - L.bustHW - armWidth * 0.8, y: Y.waist - 10 },
      { x: CX - L.bustHW - armWidth * 0.3, y: Y.waist - 10 },
      { x: CX - L.shoulderHW + 6, y: Y.shoulder + 44 },
      { x: CX - L.shoulderHW + 10, y: Y.shoulder + 4 }
    ],
    true
  )

  return {
    params,
    headCircle: { cx: headCx, cy: headCy, r: headR },
    torsoPath,
    legLeftPath,
    legRightPath,
    armLeftPath,
    feet,
    contour: { left, right, levels: L },
    viewBox: '0 0 200 400'
  }
}
