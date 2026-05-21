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

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [habits, setHabits]           = useState([])
  const [summary, setSummary]         = useState(null)
  const [weekly, setWeekly]           = useState({ thisWeek: [], days: [], scheduledThisWeek: [], todayWeekIndex: -1 })
  const [leaderboard, setLeaderboard] = useState([])
  const [allHabits, setAllHabits]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [amounts, setAmounts]         = useState({})

  const load = async () => {
    try {
      const [h, s, w, lb, all] = await Promise.all([
        habitService.getToday(),
        statsService.getSummary(),
        statsService.getWeekly(),
        statsService.getLeaderboard(),
        habitService.getAll(),
      ])
      setHabits(Array.isArray(h) ? h : [])
      setSummary(s || null)
      setWeekly(w || {})
      setLeaderboard(Array.isArray(lb) ? lb : [])
      setAllHabits(Array.isArray(all) ? all : [])
    } catch {
      toast?.error?.('Failed to refresh')
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [h, s, w, lb, all] = await Promise.all([
          habitService.getToday(),
          statsService.getSummary(),
          statsService.getWeekly(),
          statsService.getLeaderboard(),
          habitService.getAll(),
        ])
        if (!cancelled) {
          setHabits(Array.isArray(h) ? h : [])
          setSummary(s || null)
          setWeekly(w || {})
          setLeaderboard(Array.isArray(lb) ? lb : [])
          setAllHabits(Array.isArray(all) ? all : [])
        }
      } catch (err) {
        if (!cancelled)
          setError(err.response?.data?.message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
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
    try {
      if (habit.isDone) {
        await habitService.uncomplete(habit._id, {})
        toast?.info?.(`Unchecked: ${habit.name}`)
      } else {
        const amt = amounts[habit._id]
        if ((habit.type === 'time' || habit.type === 'count') && !amt) {
          toast?.error?.('Enter an amount first')
          return
        }
        await habitService.complete(habit._id, {
          actualAmount: habit.type === 'yesno' ? 1 : Number(amt || habit.target),
        })
        toast?.success?.(`${habit.name} completed — streak growing!`)
      }
      load()
    } catch (err) {
      toast?.error?.(err.response?.data?.message || 'Could not update habit')
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#9A8070] text-sm">Loading dashboard...</p>
      </div>
    )

  if (error)
    return (
      <p className="m-6 p-4 text-red-700 bg-red-50 border border-red-200 rounded-xl text-sm">
        {error}
      </p>
    )

  return (
    <PageContent>

      {/* ── HEADER ── */}
      <header className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#1C1917] tracking-tight">
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
        className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl px-5 py-4 mb-5 flex items-center gap-4"
        style={{ borderLeft: '3px solid #C4A882' }}
      >
        <p className="text-sm text-[#5a4a3a] italic flex-1">"{quote}"</p>
        <span className="text-2xl text-[#C4A882] opacity-30 shrink-0">✦</span>
      </div>

      {/* ── ROW 1: Today's Progress + Day Streak ── */}
      <div className="grid grid-cols-3 gap-4 mb-4">

        {/* Today's Progress */}
        <div className="col-span-2 bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#1C1917] mb-1">Today's Progress</h2>
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
        <div className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-5 flex flex-col items-center justify-center gap-1">
          <span className="text-4xl">🔥</span>
          <p className="font-mono text-5xl font-semibold text-[#1C1917] mt-1 leading-none">
            {bestCurrent}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-[#9A8070] mt-1">
            Day streak
          </p>
        </div>
      </div>

      {/* ── ROW 2: Habits list + Right panel ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* ── HABITS CARD (contains list + week dots + add button) ── */}
        <div className="col-span-2 bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl overflow-hidden">

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
              {habits.map((h) => (
                <div
                  key={h._id}
                  className={`flex items-center gap-3 rounded-xl p-3.5 border transition-all ${
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
                      {h.type !== 'yesno' && h.target ? ` · ${h.target}` : ''}
                      {h.isDone ? ' · Completed' : ''}
                    </p>
                  </Link>

                  {/* Streak badge */}
                  <span className="text-xs font-mono text-[#C4A882] shrink-0 hidden sm:block">
                    🔥 {h.currentStreak || 0}
                  </span>

                  {/* Amount input */}
                  {(h.type === 'time' || h.type === 'count') && !h.isDone && (
                    <input
                      type="number"
                      className="w-14 px-2 py-1.5 border border-[rgba(100,80,60,0.2)] rounded-lg text-sm bg-white text-center focus:outline-none focus:border-[#8C6E52]"
                      placeholder={String(h.target || '')}
                      value={amounts[h._id] || ''}
                      onChange={(e) =>
                        setAmounts((p) => ({ ...p, [h._id]: e.target.value }))
                      }
                    />
                  )}

                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggle(h)}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      h.isDone
                        ? 'bg-[#C4A882] border-[#C4A882] text-white'
                        : 'border-[rgba(100,80,60,0.25)] hover:border-[#8C6E52] bg-white'
                    }`}
                  >
                    {h.isDone ? '✓' : ''}
                  </button>
                </div>
              ))}
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
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                        ${isDone
                          ? 'bg-[#1C1917] text-white'
                          : isToday
                          ? 'bg-[#F2EDE6] border-2 border-[#C4A882] text-[#8C6E52]'
                          : isFuture
                          ? 'bg-[#F2EDE6] text-[#C4B8A0]'
                          : 'bg-[#F2EDE6] text-[#9A8070]'
                        }`}
                    >
                      {isDone ? '✓' : ''}
                    </div>
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
            {lbTeaser.length === 0 ? (
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