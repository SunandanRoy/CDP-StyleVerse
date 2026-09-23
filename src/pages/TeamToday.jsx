import { Link } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import { NAV_GROUPS } from '../lib/navRegistry'
import { SUB_TEAMS, SUB_TEAM_BLURBS, navGroupsForSubTeam } from '../lib/subTeamRegistry'
import NavIcon from '../components/NavIcon'
import KpiCard from '../components/KpiCard'
import BarChart from '../components/BarChart'

const GATE_COLORS = { Automate: 'var(--info)', Augment: 'var(--accent2)', Amplify: 'var(--good)' }
const GATE_DESCRIPTIONS = {
  Automate: 'AI runs this end to end — no human touch per task.',
  Augment: 'AI drafts or assists — a human reviews or finishes.',
  Amplify: 'Human-led work AI makes more effective, never replaces.'
}

export default function TeamToday() {
  const { subTeam, setSubTeam } = useBrand()
  const { data: capacityData, loading: capacityLoading } = useFetch(subTeam ? `/capacity-ledger?sub_team=${encodeURIComponent(subTeam)}` : null)
  const { data: employees, loading: employeesLoading } = useFetch(subTeam ? `/employees?sub_team=${encodeURIComponent(subTeam)}` : null)

  if (!subTeam) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold">Today</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
          This is a role-scoped home for one of the five DCX sub-teams. Pick one from "View as" in the top bar, or below, to see its own capacity split and shortcuts instead of the full leadership Dashboard.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SUB_TEAMS.map((t) => (
            <button
              key={t}
              onClick={() => setSubTeam(t)}
              className="card text-left transition hover:-translate-y-0.5"
            >
              <div className="font-heading text-sm font-bold">{t}</div>
              <div className="mt-1 text-xs" style={{ color: 'var(--ink-mute)' }}>{SUB_TEAM_BLURBS[t]}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const tasks = capacityData?.tasks || []
  const summary = capacityData?.summary
  const currentMonthIndex = summary?.current_month_index ?? 0
  const byGate = ['Automate', 'Augment', 'Amplify'].map((gate) => {
    const hrs = tasks.filter((t) => t.gate === gate).reduce((s, t) => s + (t.monthly[currentMonthIndex]?.hrs_freed || 0), 0)
    return { label: gate, value: Math.round(hrs), color: GATE_COLORS[gate] }
  })
  const totalHrs = byGate.reduce((s, g) => s + g.value, 0)
  const teamGroups = navGroupsForSubTeam(NAV_GROUPS, subTeam)

  return (
    <div className="max-w-5xl">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-bold">{subTeam} — Today</h1>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>
          View as
        </span>
      </div>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>{SUB_TEAM_BLURBS[subTeam]}</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Team headcount" value={employeesLoading ? '…' : employees?.length ?? 0} accent />
        <KpiCard label="Hours freed / mo (this team)" value={capacityLoading ? '…' : `${totalHrs.toLocaleString('en-IN')} hrs`} />
        <KpiCard label="Tasks tracked" value={capacityLoading ? '…' : tasks.length} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
            Automate / Augment / Amplify split — {summary?.months?.[currentMonthIndex]}
          </h2>
          <p className="mb-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>Per solution doc §3 — how this team's released hours break down by AI-involvement gate.</p>
          {byGate.some((g) => g.value > 0) ? <BarChart data={byGate} valueSuffix=" hrs" /> : (
            <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>No capacity tasks tagged to this sub-team yet.</p>
          )}
          <dl className="mt-3 space-y-1.5 border-t pt-3 text-[11px]" style={{ borderColor: 'var(--edge)' }}>
            {['Automate', 'Augment', 'Amplify'].map((g) => (
              <div key={g} className="flex gap-2">
                <dt className="w-16 shrink-0 font-semibold" style={{ color: GATE_COLORS[g] }}>{g}</dt>
                <dd style={{ color: 'var(--ink-mute)' }}>{GATE_DESCRIPTIONS[g]}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card">
          <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Team roster</h2>
          {employeesLoading && <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>Loading…</p>}
          {!employeesLoading && (employees?.length ?? 0) === 0 && (
            <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>No employees seeded for this sub-team.</p>
          )}
          <ul className="space-y-1.5">
            {employees?.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-xs">
                <span>{e.name}</span>
                <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--surface-alt)', color: 'var(--ink-mute)' }}>{e.brand_focus}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>This team's modules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teamGroups.flatMap((g) => g.items).map((item) => (
            <Link key={item.to} to={item.to} className="card flex items-center gap-3 transition hover:-translate-y-0.5">
              <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
        <table className="w-full min-w-[600px] text-sm">
          <thead style={{ background: 'var(--surface-alt)' }}>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              <th className="px-3 py-2">Task</th>
              <th className="px-3 py-2">Gate</th>
              <th className="px-3 py-2">Hours freed / mo</th>
              <th className="px-3 py-2">Activity</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t" style={{ borderColor: 'var(--edge)' }}>
                <td className="px-3 py-2">{t.task}</td>
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
