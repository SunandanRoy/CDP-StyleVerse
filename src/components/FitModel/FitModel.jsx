import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSilhouette } from './bodyGeometry.js'
import { buildGarmentOverlay } from './garmentOverlays.js'
import { useFetch } from '../../lib/useFetch.js'

const VIEWS = ['side', 'three_quarter', 'front', 'three_quarter', 'side']
const VIEW_SCALE_X = { side: 0.32, three_quarter: 0.68, front: 1 }
const VIEW_LABEL = { side: 'Side', three_quarter: 'Three-Quarter', front: 'Front' }

const DIRECTION_META = {
  true_to_size: { label: 'True to size', color: '#15803d', bg: '#e4f7e9' },
  runs_tight: { label: 'Runs tight', color: '#b45309', bg: '#fdf1e0' },
  runs_loose: { label: 'Runs loose', color: '#1d4ed8', bg: '#e6edfd' }
}

/**
 * Shared 2D Interactive Fit Modelling component — embedded in Modules 2, 3
 * and 7. Never randomized: renders fit_matrix[category][archetype] combined
 * with the product's confidence_score.
 */
export default function FitModel({ archetypeId, productCategory, confidenceScore, suppressAiBadge = false, heightPx = 340 }) {
  const [viewIdx, setViewIdx] = useState(2) // start front-facing
  const [direction, setDirection] = useState(1)
  const [autoRotate, setAutoRotate] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [activeDot, setActiveDot] = useState(null)
  const dragStartRef = useRef(null)

  const { data: fitRows } = useFetch(
    archetypeId && productCategory ? `/fit-matrix?category=${encodeURIComponent(productCategory)}&archetype_id=${encodeURIComponent(archetypeId)}` : null
  )

  const silhouette = useMemo(() => buildSilhouette(archetypeId), [archetypeId])
  const overlay = useMemo(() => buildGarmentOverlay(productCategory, archetypeId), [productCategory, archetypeId])

  useEffect(() => {
    setActiveDot(null)
  }, [archetypeId, productCategory])

  const step = (dir) => {
    setViewIdx((idx) => {
      let next = idx + dir
      if (next < 0) next = 1
      if (next > VIEWS.length - 1) next = VIEWS.length - 2
      return next
    })
  }

  useEffect(() => {
    if (!autoRotate) return
    const id = setInterval(() => {
      setViewIdx((idx) => {
        let dir = direction
        let next = idx + dir
        if (next >= VIEWS.length - 1) {
          next = VIEWS.length - 1
          dir = -1
        } else if (next <= 0) {
          next = 0
          dir = 1
        }
        setDirection(dir)
        return next
      })
    }, 2500)
    return () => clearInterval(id)
  }, [autoRotate, direction])

  const view = VIEWS[viewIdx]
  const viewScaleX = VIEW_SCALE_X[view]

  const onPointerDown = (e) => {
    dragStartRef.current = { x: e.clientX, startIdx: viewIdx }
    setDragging(true)
  }
  const onPointerMove = (e) => {
    if (!dragStartRef.current) return
    const delta = e.clientX - dragStartRef.current.x
    const stepPx = 45
    const stepsMoved = Math.round(delta / stepPx)
    let next = dragStartRef.current.startIdx + stepsMoved
    next = Math.max(0, Math.min(VIEWS.length - 1, next))
    setViewIdx(next)
  }
  const endDrag = () => {
    dragStartRef.current = null
    setDragging(false)
  }

  const activeZoneRow = activeDot && fitRows ? fitRows.find((r) => r.zone === activeDot.zone) : null
  const meta = activeZoneRow ? DIRECTION_META[activeZoneRow.fit_direction] : null

  return (
    <div className="select-none">
      <div
        className="relative overflow-hidden rounded-lg border"
        style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)', height: heightPx, touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={dragging ? onPointerMove : undefined}
        onPointerUp={endDrag}
        onPointerLeave={dragging ? endDrag : undefined}
      >
        {!suppressAiBadge && (
          <div
            className="absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}
          >
            AI Fit Confidence: {confidenceScore}%
          </div>
        )}
        <div className="absolute right-2 top-2 z-10 rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: 'var(--edge)', background: 'var(--surface)', color: 'var(--ink-mute)' }}>
          {VIEW_LABEL[view]} view
        </div>

        <div className="flex h-full w-full items-center justify-center" style={{ cursor: dragging ? 'grabbing' : 'grab' }}>
          <div style={{ transform: `scale(${zoom})`, transition: dragging ? 'none' : 'transform 300ms ease' }}>
            <div style={{ transform: `scaleX(${viewScaleX})`, transition: dragging ? 'none' : 'transform 350ms cubic-bezier(0.22,1,0.36,1)' }}>
              <svg width="200" height="400" viewBox={silhouette.viewBox}>
                <circle cx={silhouette.headCircle.cx} cy={silhouette.headCircle.cy} r={silhouette.headCircle.r} fill="var(--ink-mute)" opacity="0.35" />
                <path d={silhouette.legLeftPath} fill="var(--ink-mute)" opacity="0.3" />
                <path d={silhouette.legRightPath} fill="var(--ink-mute)" opacity="0.3" />
                <path d={silhouette.feet.left} fill="var(--ink-mute)" opacity="0.4" />
                <path d={silhouette.feet.right} fill="var(--ink-mute)" opacity="0.4" />
                <g>
                  <path d={silhouette.armLeftPath} fill="var(--ink-mute)" opacity="0.3" />
                </g>
                <g transform={`translate(200,0) scale(-1,1)`}>
                  <path d={silhouette.armLeftPath} fill="var(--ink-mute)" opacity="0.3" />
                </g>
                <path d={silhouette.torsoPath} fill="var(--ink-mute)" opacity="0.35" stroke="var(--ink-mute)" strokeWidth="1" />

                {overlay.paths.map((d, i) => (
                  <path key={i} d={d} fill="var(--brand-accent)" opacity={overlay.fillOpacity} stroke="var(--brand-accent)" strokeWidth="1.5" />
                ))}

                {overlay.zoneDots.map((dot) => (
                  <g key={dot.zone} transform={`translate(${dot.x},${dot.y})`} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setActiveDot(dot) }}>
                    <circle r={7} fill="var(--surface)" stroke="var(--brand-accent)" strokeWidth="2" />
                    <circle r={2.5} fill="var(--brand-accent)" />
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {activeDot && (
          <div
            className="absolute bottom-2 left-2 right-2 rounded-md border px-3 py-2 text-xs shadow-sm"
            style={{ borderColor: 'var(--edge)', background: 'var(--surface)' }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>{activeDot.zone}</span>
              {meta && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
              )}
              <button onClick={() => setActiveDot(null)} className="ml-2 text-[11px]" style={{ color: 'var(--ink-mute)' }}>✕</button>
            </div>
            <p className="mt-0.5" style={{ color: 'var(--ink-mute)' }}>
              {meta ? `From the live fit matrix for ${silhouette.params.label}.` : 'Loading fit data…'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => step(-1)} className="rounded border px-2 py-1 text-xs" style={{ borderColor: 'var(--edge)' }} aria-label="Rotate left">
            ◂
          </button>
          <button onClick={() => step(1)} className="rounded border px-2 py-1 text-xs" style={{ borderColor: 'var(--edge)' }} aria-label="Rotate right">
            ▸
          </button>
          <button
            onClick={() => setAutoRotate((v) => !v)}
            className="ml-1 rounded border px-2 py-1 text-xs font-medium"
            style={{ borderColor: 'var(--edge)', background: autoRotate ? 'var(--brand-accent-soft)' : 'transparent', color: autoRotate ? 'var(--brand-accent)' : 'var(--ink-mute)' }}
          >
            {autoRotate ? '⏸ Auto-rotating' : '▶ Auto-rotate'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px]" style={{ color: 'var(--ink-mute)' }}>Zoom</span>
          <button onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))} className="rounded border px-2 py-1 text-xs" style={{ borderColor: 'var(--edge)' }}>
            −
          </button>
          <button onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))} className="rounded border px-2 py-1 text-xs" style={{ borderColor: 'var(--edge)' }}>
            +
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
        Drag left/right on the model, use the arrows, or tap a dot to inspect a fit zone.
      </p>
    </div>
  )
}
