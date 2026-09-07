import { useBrand } from '../context/BrandContext'

export default function TopBar() {
  const { brands, brandId, setBrandId, brand } = useBrand()

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between border-b px-6"
      style={{ borderColor: 'var(--edge)', background: 'var(--surface)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded font-heading text-sm font-bold text-white"
          style={{ background: 'var(--brand-accent)' }}
        >
          SV
        </div>
        <div className="font-heading text-lg font-semibold" style={{ letterSpacing: 'var(--tracking-heading)' }}>
          StyleVerse Confidence Engine
        </div>
        <span
          className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}
        >
          Enterprise Console
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs font-medium" style={{ color: 'var(--ink-mute)' }}>
          Last 6 months
        </span>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: 'var(--edge)', background: 'var(--surface)', color: 'var(--ink)' }}
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {brand && (
          <span
            className="hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-block"
            style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}
          >
            {brand.posture}
          </span>
        )}
      </div>
    </header>
  )
}
