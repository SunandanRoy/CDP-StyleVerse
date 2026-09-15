import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavIcon from './NavIcon'
import { ALL_NAV_ITEMS } from '../lib/navRegistry'
import { useBrand } from '../context/BrandContext'
import { api } from '../lib/api'

function fuzzyMatch(query, text) {
  const q = query.toLowerCase().trim()
  if (!q) return true
  return text.toLowerCase().includes(q)
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { brands, brandId, setBrandId } = useBrand()
  const [customers, setCustomers] = useState([])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  useEffect(() => {
    const handleKeydown = (e) => {
      const isMeta = e.metaKey || e.ctrlKey
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        close()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    const handleOpenEvent = () => setOpen(true)
    window.addEventListener('styleverse:open-command-palette', handleOpenEvent)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('styleverse:open-command-palette', handleOpenEvent)
    }
  }, [open, close])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10)
  }, [open])

  // Customers are fetched lazily (only once the palette is open) and only
  // ever surfaced once the user has typed something, so the default view
  // stays a short, scannable list of modules + brands.
  useEffect(() => {
    if (!open || !brandId) return
    api.get(`/customers?brand_id=${brandId}`).then(setCustomers).catch(() => setCustomers([]))
  }, [open, brandId])

  const baseCommands = useMemo(() => {
    const navCommands = ALL_NAV_ITEMS.map((item) => ({
      id: `nav:${item.to}`,
      kind: 'navigate',
      icon: item.icon,
      label: item.label,
      hint: item.group,
      run: () => navigate(item.to)
    }))
    const brandCommands = brands.map((b) => ({
      id: `brand:${b.id}`,
      kind: 'brand',
      icon: 'dial',
      label: `Switch brand to ${b.name}`,
      hint: b.posture,
      run: () => setBrandId(b.id)
    }))
    return [...navCommands, ...brandCommands]
  }, [brands, navigate, setBrandId])

  const customerCommands = useMemo(
    () =>
      customers.map((c) => ({
        id: `customer:${c.id}`,
        kind: 'customer',
        icon: 'customers',
        label: c.name,
        hint: `Customer · ${c.id}`,
        run: () => navigate(`/customers/${c.id}`)
      })),
    [customers, navigate]
  )

  const filtered = useMemo(() => {
    const pool = query.trim() ? [...baseCommands, ...customerCommands] : baseCommands
    return pool.filter((c) => fuzzyMatch(query, `${c.label} ${c.hint}`))
  }, [baseCommands, customerCommands, query])

  useEffect(() => setActiveIndex(0), [query])

  const runActive = () => {
    const cmd = filtered[activeIndex]
    if (cmd) {
      cmd.run()
      close()
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runActive()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      style={{ background: 'rgba(10,10,12,0.45)' }}
      onClick={close}
    >
      <div
        className="glass w-full max-w-lg overflow-hidden rounded-xl"
        style={{ border: '1px solid var(--glass-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--edge)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-mute)' }}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a module, find a customer, or switch brand…"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: 'var(--ink)' }}
          />
          <kbd className="shrink-0 rounded border px-1.5 py-0.5 text-[10px]" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>
            Esc
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin p-1.5">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--ink-mute)' }}>No matches.</p>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.run()
                close()
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm"
              style={i === activeIndex ? { background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' } : { color: 'var(--ink)' }}
            >
              <NavIcon name={cmd.icon} className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
              <span className="shrink-0 text-[11px] opacity-70">{cmd.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
