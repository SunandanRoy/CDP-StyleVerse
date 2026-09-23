import { useMemo, useState } from 'react'
import { useFetch } from '../lib/useFetch'
import BarChart from '../components/BarChart'
import KpiCard from '../components/KpiCard'

const GATE_COLORS = { Automate: 'var(--info)', Augment: 'var(--accent2)', Amplify: 'var(--good)', Eliminate: 'var(--warn)' }

export default function CapacityLedger() {
  const [subTeam, setSubTeam] = useState('')
  const params = new URLSearchParams()
  if (subTeam) params.set('sub_team', subTeam)
  const { data, loading } = useFetch(`/capacity-ledger?${params.toString()}`)
  const { data: allData } = useFetch('/capacity-ledger')

  const tasks = data?.tasks
  const summary = data?.summary
  const months = summary?.months || []
  const currentMonthIndex = summary?.current_month_index ?? months.length - 1

  const subTeams = useMemo(() => [...new Set((allData?.tasks || []).map((t) => t.sub_team))], [allData])

  const byGate = useMemo(() => {
    if (!tasks) return []
    const sums = {}
    for (const t of tasks) {
      const hrs = t.monthly[currentMonthIndex]?.hrs_freed || 0
      sums[t.gate] = (sums[t.gate] || 0) + hrs
    }
    return Object.entries(sums).map(([label, value]) => ({ label, value: Math.round(value), color: GATE_COLORS[label] }))
  }, [tasks, currentMonthIndex])

  const byMonth = useMemo(() => {
    if (!tasks) return []
    return months.map((month, mi) => ({
      label: month,
      value: Math.round(tasks.reduce((s, t) => s + (t.monthly[mi]?.hrs_freed || 0), 0))
    }))
  }, [tasks, months])

  const currentMonthTotal = tasks?.reduce((s, t) => s + (t.monthly[currentMonthIndex]?.hrs_freed || 0), 0) || 0
  const progressPct = summary ? Math.min(100, Math.round((currentMonthTotal / summary.hours_target) * 100)) : 0

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-2xl font-bold">DCX Capacity Ledger</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>{tasks?.length ?? 24} seeded tasks across Automate / Augment / Amplify / Eliminate gates.</p>

      <div className="mt-4 flex items-center gap-3">
        <select value={subTeam} onChange={(e) => setSubTeam(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
          <option value="">All sub-teams</option>
          {subTeams.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {summary && (
        <div className="mt-5 card">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Released to date</h2>
            <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{months[currentMonthIndex]} · partial month</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold" style={{ color: 'var(--brand-accent)' }}>{Math.round(currentMonthTotal).toLocaleString('en-IN')} hrs/mo</span>
            <span className="text-sm" style={{ color: 'var(--ink-mute)' }}>≈ {summary.fte_released_to_date} FTE of ≈{summary.fte_target} target (≈{summary.hours_target.toLocaleString('en-IN')} hrs/mo at 160 hrs/FTE, Tier C)</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-alt)' }}>
            <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: 'var(--brand-accent)' }} />
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="This Month's Run-Rate" value={`${Math.round(currentMonthTotal).toLocaleString('en-IN')} hrs/mo`} accent />
        <KpiCard label="Tasks" value={tasks?.length ?? 0} />
        <KpiCard label="Sub-teams" value={subTeams.length} />
      </div>

      <div className="mt-6 card">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
            Zero-Layoff Pledge — Enterprise Reference Figures
          </h2>
          <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>
            Tier C — extrapolated assumption
          </span>
        </div>
        <p className="mb-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
          Extrapolated from Round 1's Marketing &amp; CX headcount ratio. Every automated task must have a named, funded, tracked destination for the hours it releases — this is where that claim is verified, not asserted.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['DCX headcount', '≈540'],
            ['FTE-equivalents target', `≈${summary?.fte_target ?? 119}`],
            ['Natural exits (attrition)', '≈130'],
            ['Coverage ratio', '≈1.09×'],
            ['Redeployments published by name', '20'],
            ['DCX champions (1:55 ratio)', '≈10']
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border p-2 text-center" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
              <div className="font-heading text-lg font-bold" style={{ color: 'var(--brand-accent)' }}>{value}</div>
              <div className="mt-0.5 text-[10px] leading-tight" style={{ color: 'var(--ink-mute)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Hours Freed by Gate — {months[currentMonthIndex]}</h2>
          {byGate.length > 0 && <BarChart data={byGate} valueSuffix=" hrs" />}
        </div>
        <div className="card">
          <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>6-Month Trend</h2>
          {byMonth.length > 0 && <BarChart data={byMonth} valueSuffix=" hrs" />}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
        <table className="w-full min-w-[720px] text-sm">
          <thead style={{ background: 'var(--surface-alt)' }}>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              <th className="px-3 py-2">Task</th>
              <th className="px-3 py-2">Sub-team</th>
              <th className="px-3 py-2">Gate</th>
              <th className="px-3 py-2">Hours Freed / mo</th>
              <th className="px-3 py-2">Exhibit 2 Activity</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center" style={{ color: 'var(--ink-mute)' }}>Loading…</td></tr>}
            {tasks?.map((t) => (
              <tr key={t.id} className="border-t" style={{ borderColor: 'var(--edge)' }}>
                <td className="px-3 py-2">{t.task}</td>
                <td className="px-3 py-2 text-xs">{t.sub_team}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${GATE_COLORS[t.gate]}22`, color: GATE_COLORS[t.gate] }}>{t.gate}</span>
                </td>
                <td className="px-3 py-2 text-xs">{Math.round(t.monthly[currentMonthIndex]?.hrs_freed || 0).toLocaleString('en-IN')}</td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{t.activity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
