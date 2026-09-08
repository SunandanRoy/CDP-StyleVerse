import { useState } from 'react'

const CATEGORY_ICON_PATHS = {
  Tops: 'M8 3l2 2h4l2-2 3 3-2.5 2.5V21H7.5V8.5L5 6z',
  Bottoms: 'M6 3h12l1 8-3 10h-3l-1-8-1 8H8L5 11z',
  Outerwear: 'M7 3l3 2h4l3-2 4 4-3 3v11H6V10L3 7z',
  Footwear: 'M4 15c0-2 2-3 4-3l3-4h3l6 4c1 .5 2 1.5 2 3v3H4z',
  Dresses: 'M9 3l3 2 3-2 2 6-2 2 2 10H6l2-10-2-2z',
  Accessories: 'M6 10a6 6 0 0112 0v3h-2v-3a4 4 0 00-8 0v3H6zM4 13h16v8H4z'
}

// Guaranteed-available inline placeholder (no network dependency) shown when
// a hotlinked image fails — keeps the "zero broken images anywhere" promise
// regardless of upstream link staleness.
function placeholderDataUri(category, accent) {
  const path = CATEGORY_ICON_PATHS[category] || CATEGORY_ICON_PATHS.Tops
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
    <rect width="400" height="500" fill="${accent || '#e5e7eb'}22"/>
    <g transform="translate(160,190) scale(3.3)"><path d="${path}" fill="${accent || '#9ca3af'}55" stroke="${accent || '#9ca3af'}" stroke-width="0.6"/></g>
    <text x="200" y="440" text-anchor="middle" font-family="sans-serif" font-size="16" fill="${accent || '#6b7280'}">${category}</text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export default function ProductImage({ src, category, alt, className = '', accent }) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      src={failed ? placeholderDataUri(category, accent) : src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
