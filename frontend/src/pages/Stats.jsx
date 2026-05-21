import { useState, useEffect } from 'react'
import { habitService } from '../services/habitService'
import { statsService } from '../services/statsService'
import { calcStreak } from '../utils/streakUtils'
import { useAuth } from '../context/AuthContext'
import PageContent from '../components/layout/PageContent'
import ConstellationMap from '../components/charts/ConstellationMap'
import WeeklyComparisonChart from '../components/charts/WeeklyComparisonChart'

export default function Stats() {
  const { user } = useAuth()
  const [habits, setHabits] = useState([])
  const [weekly, setWeekly] = useState({ thisWeek: [], lastWeek: [] })
  const [summary, setSummary] = useState(null)
  const [range, setRange] = useState('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      habitService.getAll().catch(() => []),
      statsService.getWeekly().catch(() => ({})),
      statsService.getSummary().catch(() => null),
    ])
      .then(([h, w, s]) => {
        if (cancelled) return
        setHabits(Array.isArray(h) ? h : [])
        setWeekly(w || {})
        setSummary(s)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <PageContent>
        <p className="text-[#9A8070]">Loading...</p>
      </PageContent>
    )
  }

  const bestCurrent = summary?.bestCurrentStreak ?? 0
  const bestAll = summary?.allTimeBestStreak ?? 0
  const totalCompletions = summary?.totalCompletions ?? 0

  return (
    <PageContent>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Stats</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="border rounded-lg px-3 py-2.5 text-sm bg-white w-full sm:w-auto min-h-[44px]"
        >
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="all">All time</option>
        </select>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <article className="bg-[#F2EDE6] rounded-xl p-3"><p className="text-xs text-[#9A8070]">Total habits</p><p className="font-mono text-xl">{summary?.totalHabits ?? habits.length}</p></article>
        <article className="bg-[#F2EDE6] rounded-xl p-3"><p className="text-xs text-[#9A8070]">Completions</p><p className="font-mono text-xl">{totalCompletions}</p></article>
        <article className="bg-[#F2EDE6] rounded-xl p-3"><p className="text-xs text-[#9A8070]">Best current</p><p className="font-mono text-xl">🔥 {bestCurrent}</p></article>
        <article className="bg-[#F2EDE6] rounded-xl p-3"><p className="text-xs text-[#9A8070]">All-time best</p><p className="font-mono text-xl">{bestAll}</p></article>
      </section>

      <article className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-4 sm:p-5 mb-6 overflow-x-auto">
        <h2 className="text-sm font-semibold text-[#1C1917] mb-4">Weekly comparison</h2>
        <WeeklyComparisonChart weekly={weekly} />
      </article>

      <h2 className="text-sm font-medium mb-3">Per-habit performance</h2>
      <ul className="space-y-3 mb-8">
        {habits.map((h) => {
          const s = calcStreak(h.completions || [], h.scheduleType, h.scheduleDays, user?.resetTime, h.streakCountsOnScheduledDaysOnly)
          const rate = s.totalDone ? Math.min(100, Math.round((s.totalDone / 30) * 100)) : 0
          return (
            <li key={h._id} className="bg-white border rounded-xl p-3 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4">
              <span>{h.icon}</span>
              <section className="flex-1">
                <p className="font-medium">{h.name}</p>
                <section className="h-1.5 bg-[#EDE5DB] rounded-full mt-1"><section className="h-full bg-[#8C6E52] rounded-full" style={{ width: `${rate}%` }} /></section>
              </section>
              <span className="font-mono text-sm">🔥 {s.currentStreak}</span>
              <span className="text-sm text-[#9A8070]">{s.totalDone} done</span>
            </li>
          )
        })}
      </ul>

      <article className="bg-[#1C1917] rounded-2xl p-3 sm:p-4 overflow-hidden">
        <h2 className="text-sm font-medium text-[#EDE5DB] mb-3">Your habit universe</h2>
        <ConstellationMap habits={habits} />
      </article>
    </PageContent>
  )
}
