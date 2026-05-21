import { useState, useEffect, useMemo } from 'react'
import PageContent from '../components/layout/PageContent'
import Avatar from '../components/ui/Avatar'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { habitService } from '../services/habitService'
import { statsService } from '../services/statsService'
import { calcStreak } from '../utils/streakUtils'

const QUOTES = [
  "You're on a streak. Don't break it today.",
  'We are what we repeatedly do. Excellence is not an act, but a habit.',
  'Small steps, repeated daily, become extraordinary results.',
  'Discipline is choosing what you want most over what you want now.',
  'You do not rise to your goals — you fall to your systems.',
  'Consistency beats intensity every single time.',
  'Every day is a chance to build the life you want.',
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function ProgressRing({ done, total }) {
  const r = 48
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  const offset = circ * (1 - pct)
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#F2EDE6" strokeWidth="9" />
      <circle
        cx="60" cy="60" r={r}
        fill="none"
        stroke="#C4A882"
        strokeWidth="9"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="700" fontFamily="monospace" fill="#1C1917">
        {done}/{total}
      </text>
      <text x="60" y="72" textAnchor="middle" fontSize="9" fill="#9A8070" fontFamily="sans-serif">
        done today
      </text>
    </svg>
  )
}

function formatValue(val, type) {
  if (type !== 'time') return val
  const h = Math.floor(val / 60)
  const m = val % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [habits, setHabits]           = useState([])
  const [summary, setSummary]         = useState(null)
  const [weekly, setWeekly]           = useState({ thisWeek: [], days: [], scheduledThisWeek: [], todayWeekIndex: -1 })
  const [leaderboard, setLeaderboard] = useState([])
  const [allHabits, setAllHabits]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [error, setError]             = useState('')
  const [amounts, setAmounts]         = useState({})

  const load = async () => {
    try {
      const [h, s, w, all] = await Promise.all([
        habitService.getToday(),
        statsService.getSummary(),
        statsService.getWeekly(),
        habitService.getAll(),
      ])
      setHabits(Array.isArray(h) ? h : [])
      setSummary(s || null)
      setWeekly(w || {})
      setAllHabits(Array.isArray(all) ? all : [])
    } catch {
      toast?.error?.('Failed to refresh')
    }

    try {
      setLeaderboardLoading(true)
      const lb = await statsService.getLeaderboard()
      setLeaderboard(Array.isArray(lb) ? lb : [])
    } catch (err) {
      console.warn('Failed to background refresh leaderboard spotlight:', err)
    } finally {
      setLeaderboardLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const handleCacheUpdate = (e) => {
      if (cancelled) return
      const { url, data } = e.detail
      if (url === '/habits/today' || url.endsWith('/habits/today')) {
        setHabits(Array.isArray(data) ? data : [])
      } else if (url === '/stats/summary' || url.endsWith('/stats/summary')) {
        setSummary(data || null)
      } else if (url === '/stats/weekly' || url.endsWith('/stats/weekly')) {
        setWeekly(data || {})
      }
    }

    window.addEventListener('api-cache-update', handleCacheUpdate)

    ;(async () => {
      setLoading(true)
      setError('')
      setLeaderboardLoading(true)
      try {
        const [h, s, w, all] = await Promise.all([
          habitService.getToday(),
          statsService.getSummary(),
          statsService.getWeekly(),
          habitService.getAll(),
        ])
        if (!cancelled) {
          setHabits(Array.isArray(h) ? h : [])
          setSummary(s || null)
          setWeekly(w || {})
          setAllHabits(Array.isArray(all) ? all : [])
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load dashboard')
          setLoading(false)
          return
        }
      }

      try {
        const lb = await statsService.getLeaderboard()
        if (!cancelled) {
          setLeaderboard(Array.isArray(lb) ? lb : [])
          setLeaderboardLoading(false)
        }
      } catch (err) {
        console.warn('Failed to background load leaderboard spotlight:', err)
        if (!cancelled) {
          setLeaderboardLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
      window.removeEventListener('api-cache-update', handleCacheUpdate)
    }
  }, [])

  const done  = habits.filter((h) => h.isDone).length
  const total = habits.length
  const bestCurrent = summary?.bestCurrentStreak ?? habits.reduce((m, h) => Math.max(m, h.currentStreak || 0), 0)

  const topHabit = useMemo(() => {
    let best = null, maxLong = -1
    for (const h of allHabits) {
      const s = calcStreak(h.completions || [], h.scheduleType, h.scheduleDays, user?.resetTime, h.streakCountsOnScheduledDaysOnly)
      if (s.longestStreak > maxLong) { maxLong = s.longestStreak; best = { habit: h, ...s } }
    }
    return best
  }, [allHabits, user?.resetTime])

  const quote    = QUOTES[new Date().getDay() % QUOTES.length]
  const days     = weekly.days?.length ? weekly.days : ['M','T','W','T','F','S','S']
  const tw       = weekly.thisWeek?.length === 7 ? weekly.thisWeek : [0,0,0,0,0,0,0]
  const sch      = weekly.scheduledThisWeek?.length === 7 ? weekly.scheduledThisWeek : null
  const todayIdx = typeof weekly.todayWeekIndex === 'number' ? weekly.todayWeekIndex : -1

  const nowMins  = new Date().getHours() * 60 + new Date().getMinutes()
  const upcoming = habits
    .filter((h) => {
      if (h.isDone || !h.reminderTime) return false
      const [hh, mm] = h.reminderTime.split(':').map(Number)
      return hh * 60 + mm > nowMins
    })
    .slice(0, 3)

  const uid      = user?._id || user?.id
  const lbTeaser = leaderboard.slice(0, 3)

  const toggle = async (habit) => {
    const prevHabits = [...habits]
    const nextIsDone = !habit.isDone

    // Optimistic UI updates
    const inputAmt = amounts[habit._id]
    const targetAmt = inputAmt !== undefined && inputAmt !== '' ? Number(inputAmt) : Number(habit.target || 1)
    const nextAmt = nextIsDone ? (habit.type === 'yesno' ? 1 : targetAmt) : 0

    setHabits((prev) =>
      prev.map((h) =>
        h._id === habit._id
          ? {
              ...h,
              isDone: nextIsDone,
              actualAmount: nextAmt,
              currentStreak: nextIsDone
                ? (h.currentStreak || 0) + 1
                : Math.max(0, (h.currentStreak || 1) - 1),
            }
          : h
      )
    )

    if (!nextIsDone) {
      setAmounts((p) => ({ ...p, [habit._id]: '' }))
    }

    try {
      if (habit.isDone) {
        await habitService.uncomplete(habit._id, {})
        toast?.info?.(`Unchecked: ${habit.name}`)
      } else {
        await habitService.complete(habit._id, {
          actualAmount: habit.type === 'yesno' ? 1 : targetAmt,
        })
        if (targetAmt >= habit.target) {
          toast?.success?.(`${habit.name} completed — streak growing!`)
        } else {
          toast?.info?.(`Progress logged for ${habit.name}: ${formatValue(targetAmt, habit.type)}/${formatValue(habit.target, habit.type)}`)
        }
      }
    } catch (err) {
      // Revert on error
      setHabits(prevHabits)
      toast?.error?.(err.response?.data?.message || 'Could not update habit')
    }
  }

  if (loading) {
    return (
      <PageContent>
        <div className="animate-pulse space-y-6">
          {/* Header Skeleton */}
          <header className="mb-5 space-y-2">
            <div className="h-7 w-48 bg-[#F2EDE6] rounded-lg" />
            <div className="h-4 w-32 bg-[#F2EDE6] rounded-md" />
          </header>

          {/* Quote Skeleton */}
          <div className="h-14 bg-[#F2EDE6]/40 rounded-2xl border-l-[3px] border-[#C4A882] flex items-center px-4" />

          {/* Row 1 Skeleton: Today's Progress + Day Streak */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-[#F2EDE6]/20 border border-[rgba(100,80,60,0.08)] rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 h-36">
              <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                <div className="h-5 w-40 bg-[#F2EDE6] rounded-md mx-auto sm:mx-0" />
                <div className="h-4 w-56 bg-[#F2EDE6] rounded-md mx-auto sm:mx-0" />
              </div>
              <div className="w-[120px] h-[120px] rounded-full border-[9px] border-[#F2EDE6] flex items-center justify-center shrink-0" />
            </div>
            <div className="bg-[#F2EDE6]/20 border border-[rgba(100,80,60,0.08)] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 h-36">
              <div className="h-8 w-8 bg-[#F2EDE6] rounded-full" />
              <div className="h-9 w-16 bg-[#F2EDE6] rounded-md" />
              <div className="h-3 w-20 bg-[#F2EDE6] rounded-md" />
            </div>
          </div>

          {/* Row 2 Skeleton: Habits list + Right panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Habits Card Skeleton */}
            <div className="md:col-span-2 bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div className="h-4 w-24 bg-[#F2EDE6] rounded-md" />
                <div className="h-4 w-16 bg-[#F2EDE6] rounded-md" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-3.5 border border-[rgba(100,80,60,0.08)] rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-[#F2EDE6] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-[#F2EDE6] rounded-md" />
                    <div className="h-3 w-24 bg-[#F2EDE6] rounded-md" />
                  </div>
                  <div className="h-4 w-8 bg-[#F2EDE6] rounded-md shrink-0" />
                  <div className="w-9 h-9 rounded-full bg-[#F2EDE6] shrink-0" />
                </div>
              ))}
              <div className="h-12 w-full border border-dashed border-[rgba(100,80,60,0.2)] rounded-xl bg-[#FAF8F5]/50" />
            </div>

            {/* Right Panel Skeleton */}
            <div className="space-y-4">
              {/* Quick Stats Skeleton */}
              <div className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-4 space-y-3">
                <div className="h-3.5 w-20 bg-[#F2EDE6] rounded-md mb-2" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-[#F2EDE6] rounded-md" />
                    <div className="h-4 w-8 bg-[#F2EDE6] rounded-md" />
                  </div>
                ))}
              </div>

              {/* Upcoming Skeleton */}
              <div className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-4 space-y-3">
                <div className="h-3.5 w-20 bg-[#F2EDE6] rounded-md mb-2" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F2EDE6] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 bg-[#F2EDE6] rounded-md" />
                    <div className="h-3 w-16 bg-[#F2EDE6] rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    )
  }

  if (error) {
    return (
      <PageContent>
        <p className="p-4 text-red-700 bg-red-50 border border-red-200 rounded-xl text-sm">
          {error}
        </p>
      </PageContent>
    )
  }

  return (
    <PageContent>

      {/* ── HEADER ── */}
      <header className="mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#1C1917] tracking-tight">
            {greeting()}, {user?.displayName?.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#9A8070] mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
      </header>

      {/* ── QUOTE ── */}
      <div
        className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl px-4 sm:px-5 py-4 mb-5 flex items-start sm:items-center gap-3"
        style={{ borderLeft: '3px solid #C4A882' }}
      >
        <p className="text-sm text-[#5a4a3a] italic flex-1">"{quote}"</p>
        <span className="text-xl sm:text-2xl text-[#C4A882] opacity-30 shrink-0">✦</span>
      </div>

      {/* ── ROW 1: Today's Progress + Day Streak ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* Today's Progress */}
        <div className="md:col-span-2 bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
          <div className="w-full sm:flex-1 text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-semibold text-[#1C1917] mb-1">Today's Progress</h2>
            <p className="text-sm text-[#9A8070]">
              {total - done > 0
                ? `${total - done} habits remaining to reach your goal`
                : done > 0
                ? 'All habits completed today! 🎉'
                : 'No habits scheduled today'}
            </p>
          </div>
          <ProgressRing done={done} total={total} />
        </div>

        {/* Day Streak */}
        <div className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-5 flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-1">
          <span className="text-3xl sm:text-4xl">🔥</span>
          <div className="text-center sm:text-center">
          <p className="font-mono text-4xl sm:text-5xl font-semibold text-[#1C1917] leading-none">
            {bestCurrent}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-[#9A8070] mt-1">
            Day streak
          </p>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Habits list + Right panel ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* ── HABITS CARD (contains list + week dots + add button) ── */}
        <div className="md:col-span-2 bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl overflow-hidden">

          {/* Habits header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-[10px] uppercase tracking-wider text-[#9A8070] font-semibold">
              Today's habits
            </h2>
            <Link to="/habits" className="text-xs text-[#8C6E52] hover:underline">
              Edit List
            </Link>
          </div>

          {/* Habits list */}
          {habits.length === 0 ? (
            <div className="text-center py-12 px-5">
              <p className="text-[#9A8070] text-sm mb-4">No habits scheduled today</p>
              <Link to="/habits">
                <button className="bg-[#1C1917] text-white text-sm font-medium px-5 py-2.5 rounded-xl">
                  Create your first habit
                </button>
              </Link>
            </div>
          ) : (
            <div className="px-4 space-y-2">
              {habits.map((h) => {
                const formattedTarget = formatValue(h.target, h.type)
                const currentVal = amounts[h._id] !== undefined ? amounts[h._id] : (h.actualAmount || '')
                return (
                  <div
                    key={h._id}
                    className={`flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 rounded-xl p-3 sm:p-3.5 border transition-all ${
                      h.isDone
                        ? 'bg-[#FAF8F5] border-[rgba(100,80,60,0.08)]'
                        : 'bg-white border-[rgba(100,80,60,0.12)] hover:border-[rgba(100,80,60,0.22)]'
                    }`}
                  >
                    {/* Icon */}
                    <Link
                      to={`/habits/${h._id}`}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: h.color ? `${h.color}20` : '#F2EDE6' }}
                    >
                      {h.icon}
                    </Link>

                    {/* Name + meta */}
                    <Link to={`/habits/${h._id}`} className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${h.isDone ? 'line-through text-[#9A8070]' : 'text-[#1C1917]'}`}>
                        {h.name}
                      </p>
                      <p className="text-xs text-[#9A8070] mt-0.5 capitalize">
                        {h.scheduleType}
                        {h.type !== 'yesno' && h.target ? ` · ${formattedTarget}` : ''}
                        {h.isDone ? ' · Completed' : ''}
                      </p>
                    </Link>

                    {/* Streak badge */}
                    <span className="text-xs font-mono text-[#C4A882] shrink-0 order-3 sm:order-none">
                      🔥 {h.currentStreak || 0}
                    </span>

                    {/* Amount input */}
                    {(h.type === 'time' || h.type === 'count') && !h.isDone && (
                      <input
                        type="number"
                        className="w-14 px-2 py-1.5 border border-[rgba(100,80,60,0.2)] rounded-lg text-sm bg-white text-center focus:outline-none focus:border-[#8C6E52]"
                        placeholder={String(h.target || '')}
                        value={currentVal}
                        onChange={(e) =>
                          setAmounts((p) => ({ ...p, [h._id]: e.target.value }))
                        }
                      />
                    )}

                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggle(h)}
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-all relative ${
                        h.isDone
                          ? 'bg-[#C4A882] border-[#C4A882] text-white'
                          : 'border-[rgba(100,80,60,0.25)] hover:border-[#8C6E52] bg-white'
                      }`}
                    >
                      {h.isDone ? (
                        '✓'
                      ) : h.actualAmount > 0 && h.target > 0 ? (
                        <svg width="32" height="32" viewBox="0 0 32 32" className="absolute inset-0 m-auto">
                          <circle cx="16" cy="16" r="13" fill="none" stroke="#FAF8F5" strokeWidth="2" />
                          <circle
                            cx="16" cy="16" r="13"
                            fill="none"
                            stroke="#C4A882"
                            strokeWidth="3"
                            strokeDasharray={2 * Math.PI * 13}
                            strokeDashoffset={2 * Math.PI * 13 * (1 - Math.min(1, h.actualAmount / h.target))}
                            strokeLinecap="round"
                            transform="rotate(-90 16 16)"
                          />
                          <text x="16" y="19" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#8C6E52">
                            {Math.round((h.actualAmount / h.target) * 100)}%
                          </text>
                        </svg>
                      ) : (
                        ''
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── THIS WEEK dots (inside habits card at bottom) ── */}
          <div className="px-5 pt-4 pb-5 mt-3 border-t border-[rgba(100,80,60,0.08)]">
            <p className="text-[10px] uppercase tracking-wider text-[#9A8070] mb-3 font-semibold">
              This week
            </p>
            <div className="flex items-center gap-2">
              {days.map((d, i) => {
                const denom   = sch ? Number(sch[i]) : 1
                const raw     = Number(tw[i]) || 0
                const isDone  = denom > 0 ? raw >= denom : raw > 0
                const isToday = i === todayIdx
                const isFuture = todayIdx !== -1 && i > todayIdx
                const pct = weekly.thisWeekRates?.length === 7 ? weekly.thisWeekRates[i] : (isDone ? 100 : 0)

                return (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                    {pct >= 100 || isDone ? (
                      <div
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-semibold bg-[#1C1917] text-white transition-all shadow-sm"
                      >
                        ✓
                      </div>
                    ) : pct > 0 ? (
                      <div
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold border border-[#C4A882]/40 relative overflow-hidden transition-all shadow-sm"
                        style={{
                          background: `linear-gradient(to top, #C4A882 ${pct}%, #F2EDE6 ${pct}%)`
                        }}
                      >
                        <span className={pct > 50 ? 'text-white' : 'text-[#8C6E52]'}>
                          {pct}%
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                          ${isToday
                            ? 'bg-[#F2EDE6] border-2 border-[#C4A882] text-[#8C6E52]'
                            : isFuture
                            ? 'bg-[#F2EDE6] text-[#C4B8A0]'
                            : 'bg-[#F2EDE6] text-[#9A8070]'
                          }`}
                      />
                    )}
                    <span className="text-[9px] text-[#9A8070]">
                      {typeof d === 'string' ? d[0] : d}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── ADD NEW HABIT dashed button ── */}
          <div className="px-4 pb-4">
            <Link to="/habits">
              <div className="flex items-center justify-center gap-2 rounded-xl py-3.5 border border-dashed border-[rgba(100,80,60,0.25)] text-[#9A8070] text-sm hover:border-[#8C6E52] hover:text-[#8C6E52] transition-colors cursor-pointer">
                + Add a new habit
              </div>
            </Link>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="space-y-4">

          {/* Quick Stats */}
          <div className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-4">
            <h3 className="text-[10px] uppercase tracking-wider text-[#9A8070] font-semibold mb-3">
              Quick stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#5a4a3a]">Total Habits</span>
                <span className="font-mono font-semibold text-[#1C1917]">
                  {summary?.totalHabits ?? allHabits.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#5a4a3a]">Done this week</span>
                <span className="font-mono font-semibold text-[#1C1917]">
                  {summary?.doneThisWeek ?? tw.reduce((a, b) => a + (Number(b) || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#5a4a3a]">Completion Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-[#F2EDE6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C4A882] rounded-full transition-all"
                      style={{ width: `${summary?.completionRate ?? 0}%` }}
                    />
                  </div>
                  <span className="font-mono font-semibold text-[#1C1917] text-sm">
                    {summary?.completionRate ?? 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming reminders */}
          <div className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-4">
            <h3 className="text-[10px] uppercase tracking-wider text-[#9A8070] font-semibold mb-3">
              Upcoming
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-[#9A8070]">No more reminders today</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((h) => (
                  <Link
                    key={h._id}
                    to={`/habits/${h._id}`}
                    className="flex items-center gap-3 group"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                      style={{ background: h.color ? `${h.color}20` : '#F2EDE6' }}
                    >
                      {h.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1C1917] truncate group-hover:text-[#8C6E52] transition-colors">
                        {h.name}
                      </p>
                      <p className="text-xs text-[#9A8070]">
                        Today, {h.reminderTime}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard teaser */}
          <div className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-4">
            <h3 className="text-[10px] uppercase tracking-wider text-[#9A8070] font-semibold mb-3">
              Leaderboard spotlight
            </h3>
            {leaderboardLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="bg-[#FAF8F5] border border-[rgba(100,80,60,0.06)] rounded w-5 h-4 shrink-0" />
                    <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[rgba(100,80,60,0.06)] shrink-0" />
                    <div className="flex-1 h-4 bg-[#FAF8F5] border border-[rgba(100,80,60,0.06)] rounded" />
                    <div className="w-8 h-4 bg-[#FAF8F5] border border-[rgba(100,80,60,0.06)] rounded shrink-0" />
                  </div>
                ))}
              </div>
            ) : lbTeaser.length === 0 ? (
              <p className="text-xs text-[#9A8070]">No public streaks yet.</p>
            ) : (
              <div className="space-y-2.5">
                {lbTeaser.map((r, i) => {
                  const rid   = r.userId || r.id
                  const isYou = uid && rid && String(rid) === String(uid)
                  return (
                    <div key={rid || i} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-[#C4A882] w-5 shrink-0">#{i + 1}</span>
                      <Avatar
                        user={{ displayName: r.displayName, profileImage: r.profileImage }}
                        size={28}
                      />
                      <span className="flex-1 truncate text-[#1C1917]">{r.displayName}</span>
                      {isYou && (
                        <span className="text-[9px] uppercase bg-[#1C1917] text-white px-1.5 py-0.5 rounded shrink-0">
                          you
                        </span>
                      )}
                      <span className="font-mono text-[#8C6E52] shrink-0">{r.streak}d</span>
                    </div>
                  )
                })}
              </div>
            )}
            <Link to="/leaderboard" className="inline-block mt-3 text-xs text-[#8C6E52] hover:underline">
              Full leaderboard →
            </Link>
          </div>

        </div>
      </div>
    </PageContent>
  )
}