import { ARCHETYPE_BODY_PARAMS, bodyLevels, CX, Y, smoothPath, torsoContourPoints } from './bodyGeometry.js'
import { ZONES_BY_CATEGORY } from '../../../shared/zones.js'

function offsetPoint(p, margin) {
  const dir = p.x < CX ? -1 : p.x === CX ? 0 : 1
  return { x: p.x + dir * margin, y: p.y }
}

/**
 * Builds a garment silhouette overlay + tap-to-inspect zone-dot anchor
 * positions for one product category, driven purely by the archetype's body
 * geometry (never randomized).
 */
export function buildGarmentOverlay(category, archetypeId) {
  const params = ARCHETYPE_BODY_PARAMS[archetypeId] || ARCHETYPE_BODY_PARAMS.arch_regular_slim
  const { left, right } = torsoContourPoints(params)
  const L = bodyLevels(params)
  const zones = ZONES_BY_CATEGORY[category] || []

  const byY = (y) => left.find((p) => p.y === y) || left[0]

  if (category === 'Tops' || category === 'Outerwear') {
    const margin = category === 'Outerwear' ? 13 : 7
    const hemY = Y.waist + (category === 'Outerwear' ? 30 : 4)
    const topLeft = [
      { x: CX - L.neckHW - margin * 0.4, y: Y.neck - 2 },
      offsetPoint(byY(Y.shoulder), margin),
      offsetPoint(byY(Y.bust), margin),
      { x: CX - L.waistHW - margin, y: hemY }
    ]
    const closed = [...topLeft, ...topLeft.map((p) => ({ x: 2 * CX - p.x, y: p.y })).reverse()]
    const path = smoothPath(closed, true)
    const zoneDots = [
      { zone: zones[0], x: CX - L.shoulderHW - margin + 4, y: Y.shoulder + 2 },
      { zone: zones[1], x: CX, y: Y.bust },
      { zone: zones[2], x: CX - L.shoulderHW - margin - 6, y: Y.shoulder + 55 }
    ]
    return { paths: [path], zoneDots, fillOpacity: 0.55 }
  }

  if (category === 'Bottoms') {
    const margin = 6
    const waistY = Y.waist - 6
    const pts = [
      { x: CX - L.waistHW - margin, y: waistY },
      { x: CX - L.hipHW - margin, y: Y.hip },
      { x: CX - L.hipHW * 0.62 - margin, y: Y.crotch },
      { x: CX - L.thighHW - margin * 0.6, y: L.kneeY },
      { x: CX - 9, y: L.ankleY }
    ]
    const closed = [...pts, ...pts.map((p) => ({ x: 2 * CX - p.x, y: p.y })).reverse()]
    const path = smoothPath(closed, true)
    const zoneDots = [
      { zone: zones[0], x: CX, y: waistY },
      { zone: zones[1], x: CX - L.hipHW - margin + 4, y: Y.hip },
      { zone: zones[2], x: CX - L.thighHW, y: (Y.crotch + L.kneeY) / 2 }
    ]
    return { paths: [path], zoneDots, fillOpacity: 0.5 }
  }

  if (category === 'Dresses') {
    const margin = 8
    const hemY = Y.crotch + (L.kneeY - Y.crotch) * 0.55
    const pts = [
      offsetPoint(byY(Y.shoulder), margin * 0.6),
      offsetPoint(byY(Y.bust), margin),
      offsetPoint(byY(Y.waist), margin * 0.7),
      { x: CX - L.hipHW - margin * 1.6, y: Y.hip + 10 },
      { x: CX - L.hipHW - margin * 2, y: hemY }
    ]
    const closed = [...pts, ...pts.map((p) => ({ x: 2 * CX - p.x, y: p.y })).reverse()]
    const path = smoothPath(closed, true)
    const zoneDots = [
      { zone: zones[0], x: CX, y: Y.bust },
      { zone: zones[1], x: CX, y: Y.waist },
      { zone: zones[2], x: CX - L.hipHW - margin, y: Y.hip + 4 }
    ]
    return { paths: [path], zoneDots, fillOpacity: 0.5 }
  }

  if (category === 'Footwear') {
    const footY = L.ankleY + 14
    const shapeLeft = `M ${CX - L.ankleHW - 8} ${L.ankleY - 4} Q ${CX - L.ankleHW - 20} ${footY} ${CX - L.ankleHW + 4} ${footY + 3} L ${CX - L.ankleHW + 9} ${L.ankleY - 4} Z`
    const shapeRight = `M ${CX + L.ankleHW + 8} ${L.ankleY - 4} Q ${CX + L.ankleHW + 20} ${footY} ${CX + L.ankleHW - 4} ${footY + 3} L ${CX + L.ankleHW - 9} ${L.ankleY - 4} Z`
    const zoneDots = [
      { zone: zones[0], x: CX - L.ankleHW - 15, y: footY - 2 },
      { zone: zones[1], x: CX - L.ankleHW, y: L.ankleY + 4 },
      { zone: zones[2], x: CX - L.ankleHW - 6, y: L.ankleY - 2 }
    ]
    return { paths: [shapeLeft, shapeRight], zoneDots, fillOpacity: 0.65 }
  }

  // Accessories — a shoulder strap + a belt line, not a full garment silhouette
  const strap = `M ${CX - L.shoulderHW + 6} ${Y.shoulder} L ${CX - L.bustHW + 4} ${Y.waist - 10} L ${CX - L.bustHW + 10} ${Y.waist - 10} L ${CX - L.shoulderHW + 12} ${Y.shoulder + 2} Z`
  const belt = `M ${CX - L.waistHW - 4} ${Y.waist} L ${CX + L.waistHW + 4} ${Y.waist} L ${CX + L.waistHW + 4} ${Y.waist + 8} L ${CX - L.waistHW - 4} ${Y.waist + 8} Z`
  const zoneDots = [
    { zone: zones[0], x: CX - L.bustHW + 7, y: Y.waist - 20 },
    { zone: zones[1], x: CX, y: Y.waist + 4 }
  ]
  return { paths: [strap, belt], zoneDots, fillOpacity: 0.7 }
}
