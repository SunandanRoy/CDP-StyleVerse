import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import Skeleton from '../components/Skeleton'
import ExportCsvButton from '../components/ExportCsvButton'
import { formatDateIN } from '../../shared/sce-lib.mjs'

const CSV_COLUMNS = [
  { label: 'Name', key: 'name' },
  { label: 'Customer ID', key: 'id' },
  { label: 'Channels', value: (c) => c.channels.join('; ') },
  { label: 'Fit Passport', value: (c) => c.fit_passport_status },
  { label: 'Archetype', value: (c) => c.fit_passport.archetype },
  { label: 'Signup Date', key: 'signup_date' }
]

const MKT_CSV_COLUMNS = [
  { label: 'Buyer Alias', key: 'buyer_alias' },
  { label: 'Orders', key: 'order_count' },
  { label: 'Returns', key: 'return_count' },
  { label: 'Claimed', value: (b) => (b.claimed_by ? 'Yes' : b.pending_claim_for ? 'Claim pending' : 'No') }
]

export default function CustomerList() {
  const { brandId } = useBrand()
  const [view, setView] = useState('d2c') // 'd2c' | 'marketplace'
  const [search, setSearch] = useState('')

  const params = new URLSearchParams({ brand_id: brandId })
  if (search) params.set('search', search)
  const { data: customers, loading } = useFetch(brandId && view === 'd2c' ? `/customers?${params.toString()}` : null)
  const { data: mktBuyers, loading: mktLoading } = useFetch(brandId && view === 'marketplace' ? `/marketplace-buyers?brand_id=${brandId}` : null)

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-2xl font-bold">Unified Profile View</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        D2C-identified customers carry a name and Fit Passport; marketplace platforms give StyleVerse no customer-level identity (§9), so those buyers are shown separately, order-level only.
      </p>

      <div className="mt-4 flex overflow-hidden rounded-md border" style={{ borderColor: 'var(--edge)', width: 'fit-content' }}>
        {[
          { id: 'd2c', label: 'D2C customers' },
          { id: 'marketplace', label: 'Marketplace buyers (order-level only)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className="px-3 py-1.5 text-sm font-medium"
            style={view === tab.id ? { background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' } : { background: 'var(--surface)', color: 'var(--ink-mute)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'd2c' ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID or loyalty ID…"
              className="w-64 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--edge)' }}
            />
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
                      <span className="text-xs font-medium" style={{ color: c.fit_passport_bridged ? 'var(--good)' : 'var(--ink-mute)' }}>{c.fit_passport_status}</span>
                    </td>
                    <td className="px-4 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{c.fit_passport.archetype}</td>
                    <td className="px-4 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{formatDateIN(c.signup_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 rounded-md border p-3 text-sm" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
            No name, archetype, or Fit Passport is ever shown here — marketplace platforms give StyleVerse order-level data only (SKU, size, reason code, delivery status), never customer identity. Buyers are keyed by an anonymous alias until they claim their orders via the D2C→Marketplace bridge (D5).
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {mktBuyers && <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{mktBuyers.length} marketplace buyers</span>}
            <ExportCsvButton filename={`styleverse-marketplace-buyers-${brandId}.csv`} rows={mktBuyers} columns={MKT_CSV_COLUMNS} />
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
            <table className="w-full min-w-[480px] text-sm">
              <thead style={{ background: 'var(--surface-alt)' }}>
                <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                  <th className="px-4 py-2">Buyer Alias</th>
                  <th className="px-4 py-2">Orders</th>
                  <th className="px-4 py-2">Returns</th>
                  <th className="px-4 py-2">Claim Status</th>
                </tr>
              </thead>
              <tbody>
                {mktLoading && <tr><td colSpan={4} className="px-4 py-6 text-center" style={{ color: 'var(--ink-mute)' }}>Loading…</td></tr>}
                {mktBuyers?.map((b) => (
                  <tr key={b.buyer_alias} className="border-t" style={{ borderColor: 'var(--edge)' }}>
                    <td className="px-4 py-2 font-mono text-xs">{b.buyer_alias}</td>
                    <td className="px-4 py-2 text-xs">{b.order_count}</td>
                    <td className="px-4 py-2 text-xs">{b.return_count}</td>
                    <td className="px-4 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>
                      {b.claimed_by ? <span style={{ color: 'var(--good)' }}>Claimed</span> : b.pending_claim_for ? <span style={{ color: 'var(--warn)' }}>Claim pending</span> : 'Unclaimed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
