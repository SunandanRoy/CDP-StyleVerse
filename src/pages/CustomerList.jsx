import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import Skeleton from '../components/Skeleton'
import ExportCsvButton from '../components/ExportCsvButton'

const CSV_COLUMNS = [
  { label: 'Name', key: 'name' },
  { label: 'Customer ID', key: 'id' },
  { label: 'Channels', value: (c) => c.channels.join('; ') },
  { label: 'Fit Passport', value: (c) => (c.loyalty_id ? `Linked · ${c.loyalty_id}` : 'Not yet bridged') },
  { label: 'Archetype', value: (c) => c.fit_passport.archetype },
  { label: 'Signup Date', key: 'signup_date' }
]

const CHANNEL_FILTERS = [
  { value: '', label: 'All channels' },
  { value: 'd2c_only', label: 'D2C-only' },
  { value: 'marketplace_only', label: 'Marketplace-only' },
  { value: 'bridged', label: 'Bridged' }
]

export default function CustomerList() {
  const { brandId } = useBrand()
  const [search, setSearch] = useState('')
  const [channelType, setChannelType] = useState('')

  const params = new URLSearchParams({ brand_id: brandId })
  if (search) params.set('search', search)
  if (channelType) params.set('channel_type', channelType)
  const { data: customers, loading } = useFetch(brandId ? `/customers?${params.toString()}` : null)

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-2xl font-bold">Unified Profile View</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        Searchable customer directory, merging D2C and marketplace identities where bridged via a Fit Passport.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, ID or loyalty ID…"
          className="w-64 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--edge)' }}
        />
        <select value={channelType} onChange={(e) => setChannelType(e.target.value)} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--edge)' }}>
          {CHANNEL_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        {customers && <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{customers.length} customers</span>}
        <ExportCsvButton filename={`styleverse-customers-${brandId}.csv`} rows={customers} columns={CSV_COLUMNS} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
        <table className="w-full min-w-[720px] text-sm">
          <thead style={{ background: 'var(--surface-alt)' }}>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Channels</th>
              <th className="px-4 py-2">Fit Passport</th>
              <th className="px-4 py-2">Archetype</th>
              <th className="px-4 py-2">Signup</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t" style={{ borderColor: 'var(--edge)' }}>
                  <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-28" /></td>
                  <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-20" /></td>
                  <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-24" /></td>
                  <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-16" /></td>
                  <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-16" /></td>
                </tr>
              ))}
            {customers?.map((c) => (
              <tr key={c.id} className="border-t" style={{ borderColor: 'var(--edge)' }}>
                <td className="px-4 py-2">
                  <Link to={`/customers/${c.id}`} className="font-medium hover:underline" style={{ color: 'var(--brand-accent)' }}>
                    {c.name}
                  </Link>
                  <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>{c.id}</div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    {c.channels.map((ch) => (
                      <span key={ch} className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: 'var(--edge)' }}>{ch}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {c.loyalty_id ? (
                    <span className="text-xs font-medium" style={{ color: 'var(--good)' }}>Linked · {c.loyalty_id}</span>
                  ) : (
                    <span className="text-xs font-medium" style={{ color: 'var(--warn)' }}>Not yet bridged</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{c.fit_passport.archetype}</td>
                <td className="px-4 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{c.signup_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
