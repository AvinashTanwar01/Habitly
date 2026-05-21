import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { habitService } from '../services/habitService'
import { calcStreak, completionRate, addDays, formatDate, isScheduled, getEffectiveToday } from '../utils/streakUtils'
import { useAuth } from '../context/AuthContext'
import HabitConstellation from '../components/charts/HabitConstellation'
import HabitForm from '../components/habits/HabitForm'
import Button from '../components/ui/Button'
import PageContent from '../components/layout/PageContent'

function ProgressRing({ pct, size = 44 }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDE5DB" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#8C6E52"
        strokeWidth="4"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function HabitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [amount, setAmount] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const notesKey = `habitNotes_${id}`

  useEffect(() => {
    let cancelled = false
    setData(null)
    habitService
      .getOne(id)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) navigate('/habits')
      })
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  const reload = () => {
    habitService.getOne(id).then(setData).catch(() => navigate('/habits'))
  }

  if (!data) {
    return (
      <PageContent>
        <p className="text-[#9A8070]">Loading…</p>
      </PageContent>
    )
  }

  const { habit, completions = [], todayCompletion } = data
  const streak = calcStreak(
    completions,
    habit.scheduleType,
    habit.scheduleDays,
    user?.resetTime,
    habit.streakCountsOnScheduledDaysOnly
  )
  const rate = completionRate(completions, habit.scheduleType, habit.scheduleDays)
  const notes = JSON.parse(localStorage.getItem(notesKey) || '[]')
  const today = getEffectiveToday(new Date(), user?.resetTime)
  const todayPct = todayCompletion?.isDone
    ? Math.min(100, ((todayCompletion.actualAmount || 1) / (habit.target || 1)) * 100)
    : 0

  const complete = async () => {
    await habitService.complete(id, {
      isDone: true,
      actualAmount: habit.type === 'yesno' ? 1 : Number(amount || habit.target),
    })
    reload()
  }

  const addNote = () => {
    if (!noteText.trim()) return
    const next = [...notes, { text: noteText, date: new Date().toISOString() }]
    localStorage.setItem(notesKey, JSON.stringify(next))
    setNoteText('')
    reload()
  }

  const monthStart = new Date(today)
  monthStart.setDate(1)
  const monthLabel = monthStart.toLocaleString('default', { month: 'long', year: 'numeric' })
  const firstDow = (monthStart.getDay() + 6) % 7
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
  const calendarCells = []
  for (let i = 0; i < firstDow; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const date = formatDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), d))
    calendarCells.push(date)
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekBars = weekDays.map((_, i) => {
    const dow = (new Date(today).getDay() + 6) % 7
    const date = addDays(today, i - dow)
    const c = completions.find((x) => x.date === date)
    const mins = c?.isDone ? c.actualAmount || habit.target || 0 : 0
    return { label: weekDays[i], mins }
  })
  const weekTotal = weekBars.reduce((s, b) => s + b.mins, 0)
  const maxWeek = Math.max(...weekBars.map((b) => b.mins), 1)

  const subtitle =
    habit.type === 'time'
      ? `${habit.target} minutes of ${habit.name.toLowerCase()}`
      : habit.type === 'count'
        ? `Target ${habit.target} per day`
        : habit.scheduleType === 'daily'
          ? 'Daily habit'
          : 'Scheduled habit'

  return (
    <PageContent className="max-w-6xl mx-auto">
      <Link to="/habits" className="inline-flex items-center gap-1 text-sm text-[#8C6E52] hover:underline mb-5">
        <i className="ti ti-arrow-left text-sm" /> Back to habits
      </Link>

      <p className="text-xs text-[#9A8070] mb-1">{subtitle}</p>

      <article className="bg-[#1C1917] rounded-2xl overflow-hidden mb-4 border border-[#2a2624]">
        <header className="px-4 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[#9A8070]">Consistency Sky</span>
          <span className="text-lg">{habit.icon}</span>
        </header>
        <HabitConstellation
          completions={completions}
          target={habit.target}
          habitName={habit.name}
          scheduleType={habit.scheduleType}
          scheduleDays={habit.scheduleDays}
        />
      </article>

      <article className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl px-4 py-3 mb-6 flex flex-wrap items-center gap-4">
        <ProgressRing pct={todayPct} />
        <section className="flex-1 min-w-[140px]">
          <p className="text-sm font-medium text-[#1C1917]">
            Did you {habit.name.toLowerCase()} today?
          </p>
          {todayCompletion?.isDone ? (
            <p className="text-xs text-green-700 mt-0.5">Logged — {todayCompletion.actualAmount}{habit.type === 'time' ? ' min' : ''}</p>
          ) : null}
        </section>
        {(habit.type === 'time' || habit.type === 'count') && !todayCompletion?.isDone && (
          <input
            type="number"
            className="w-24 border border-[rgba(100,80,60,0.2)] rounded-lg px-2 py-1.5 text-sm bg-[#FAF8F5]"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(habit.target)}
          />
        )}
        {!todayCompletion?.isDone && (
          <Button onClick={complete} className="shrink-0">
            Log today
          </Button>
        )}
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="text-xs text-[#8C6E52] hover:underline ml-auto"
        >
          Edit habit
        </button>
      </article>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ['Current streak', `${streak.currentStreak} days`],
          ['Best streak', `${streak.longestStreak} days`],
          ['Total sessions', String(streak.totalDone)],
          ['Completion', `${rate}%`],
        ].map(([label, value]) => (
          <article
            key={label}
            className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-4"
          >
            <p className="text-[10px] uppercase tracking-wider text-[#9A8070] font-semibold">{label}</p>
            <p className="font-mono text-xl mt-1 text-[#1C1917]">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mb-8">
        <article className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-5">
          <header className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Consistency calendar</h2>
            <span className="text-xs text-[#9A8070]">{monthLabel}</span>
          </header>
          <section className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-[#9A8070] mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </section>
          <section className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((date, i) => {
              if (!date) return <span key={`e-${i}`} />
              const sched = isScheduled(date, habit.scheduleType, habit.scheduleDays)
              const c = completions.find((x) => x.date === date)
              const isToday = date === today
              const future = date > today
              return (
                <span
                  key={date}
                  title={date}
                  className={`aspect-square rounded-full flex items-center justify-center text-[9px] ${
                    !sched
                      ? 'bg-transparent text-transparent'
                      : c?.isDone
                        ? 'bg-[#1C1917] text-white'
                        : future
                          ? 'border border-[#EDE5DB] bg-transparent'
                          : 'bg-[#EDE5DB]'
                  } ${isToday ? 'ring-2 ring-[#C4A882] ring-offset-1' : ''}`}
                >
                  {new Date(date).getDate()}
                </span>
              )
            })}
          </section>
        </article>

        <section className="space-y-4">
          <article className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-5 text-sm space-y-2">
            <h2 className="text-sm font-semibold mb-3">Habit details</h2>
            <p className="flex justify-between"><span className="text-[#9A8070]">Type</span><span className="capitalize">{habit.type}</span></p>
            <p className="flex justify-between"><span className="text-[#9A8070]">Target</span><span>{habit.target}{habit.type === 'time' ? ' min' : ''}</span></p>
            <p className="flex justify-between"><span className="text-[#9A8070]">Schedule</span><span className="capitalize">{habit.scheduleType}</span></p>
            <p className="flex justify-between"><span className="text-[#9A8070]">Reminder</span><span>{habit.reminderTime || '—'}</span></p>
            <p className="flex justify-between"><span className="text-[#9A8070]">Start date</span><span>{new Date(habit.createdAt).toLocaleDateString()}</span></p>
          </article>

          <article className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-5">
            <header className="flex justify-between items-baseline mb-3">
              <h2 className="text-sm font-semibold">Weekly performance</h2>
              <span className="text-xs font-mono text-[#8C6E52]">{weekTotal} min</span>
            </header>
            <section className="flex items-end gap-2 h-28">
              {weekBars.map((b) => (
                <section key={b.label} className="flex-1 flex flex-col items-center gap-1">
                  <section className="w-full bg-[#EDE5DB] rounded-t flex-1 flex items-end min-h-[60px]">
                    <section
                      className="w-full bg-[#8C6E52] rounded-t transition-all"
                      style={{ height: `${(b.mins / maxWeek) * 100}%`, minHeight: b.mins ? 4 : 0 }}
                    />
                  </section>
                  <span className="text-[9px] text-[#9A8070]">{b.label}</span>
                </section>
              ))}
            </section>
          </article>
        </section>
      </section>

      <article className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-5">
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">My notes</h2>
          <Button variant="outline" onClick={() => document.getElementById('habit-note-input')?.focus()}>
            New note
          </Button>
        </header>
        <ul className="space-y-4 mb-4">
          {notes.length === 0 && <p className="text-sm text-[#9A8070]">No notes yet.</p>}
          {notes.map((n, i) => (
            <li key={i} className="border-b border-[rgba(100,80,60,0.08)] pb-3 last:border-0">
              <p className="text-sm text-[#1C1917]">{n.text}</p>
              <p className="text-xs text-[#9A8070] mt-1">{new Date(n.date).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
        <section className="flex gap-2">
          <input
            id="habit-note-input"
            className="flex-1 border border-[rgba(100,80,60,0.2)] rounded-lg px-3 py-2 text-sm bg-[#FAF8F5]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write a reflection…"
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
          />
          <Button onClick={addNote}>Add</Button>
        </section>
      </article>

      <HabitForm
        open={editOpen}
        initial={habit}
        onClose={() => setEditOpen(false)}
        onSave={async (d) => {
          await habitService.update(id, d)
          reload()
        }}
      />
    </PageContent>
  )
}
