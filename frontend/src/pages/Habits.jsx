import { useState, useEffect } from 'react'
import PageContent from '../components/layout/PageContent'
import { habitService } from '../services/habitService'
import { statsService } from '../services/statsService'
import { getEffectiveToday } from '../utils/streakUtils'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import HabitCard from '../components/habits/HabitCard'
import HabitForm from '../components/habits/HabitForm'
import Button from '../components/ui/Button'

const FILTERS = ['all', 'daily', 'weekdays', 'weekends', 'custom']

export default function Habits() {
  const [view, setView] = useState('active') // active | archived
  const { user } = useAuth()
  const { toast } = useToast()
  const [habits, setHabits] = useState([])
  const [archived, setArchived] = useState([])
  const [weekly, setWeekly] = useState({})
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState({ open: false, habit: null })

  useEffect(() => {
    let cancelled = false
    let timer
    const fetchData = async () => {
      setLoading(true)
      setError('')
      setWeeklyLoading(true)
      timer = window.setTimeout(() => {
        if (cancelled) return
        setLoading(false)
        setError('Loading timed out. Please refresh and try again.')
      }, 10000)
      try {
        const [h, a] = await Promise.all([
          habitService.getAll(),
          habitService.getArchived().catch(() => []),
        ])
        if (!cancelled) {
          setHabits(Array.isArray(h) ? h : [])
          setArchived(Array.isArray(a) ? a : [])
          setLoading(false)
          window.clearTimeout(timer)
        }
      } catch (err) {
        console.error('Failed to fetch habits list:', err)
        if (!cancelled) {
          setHabits([])
          setError(err.response?.data?.message || 'Failed to load habits')
          setLoading(false)
          window.clearTimeout(timer)
          return
        }
      }

      try {
        const w = await statsService.getWeekly()
        if (!cancelled) {
          setWeekly(w || {})
          setWeeklyLoading(false)
        }
      } catch (err) {
        console.warn('Failed to background load weekly stats:', err)
        if (!cancelled) {
          setWeeklyLoading(false)
        }
      }
    }
    fetchData()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const load = async () => {
    try {
      const [h, a] = await Promise.all([
        habitService.getAll(),
        habitService.getArchived().catch(() => []),
      ])
      setHabits(Array.isArray(h) ? h : [])
      setArchived(Array.isArray(a) ? a : [])
    } catch (err) {
      console.error('Failed to fetch habits:', err)
      toast.error('Failed to refresh habits list')
    }

    try {
      setWeeklyLoading(true)
      const w = await statsService.getWeekly()
      setWeekly(w || {})
    } catch (err) {
      console.warn('Failed to background load weekly stats:', err)
    } finally {
      setWeeklyLoading(false)
    }
  }

  const today = getEffectiveToday(new Date(), user?.resetTime)
  const todayHabits = habits.filter((h) => {
    const c = (h.completions || []).find((x) => x.date === today && x.isDone)
    return !!c
  })

  const tw = weekly.thisWeek || []
  const sch = weekly.scheduledThisWeek || []
  const sumDone = tw.reduce((a, b) => a + (Number(b) || 0), 0)
  const sumSch = sch.reduce((a, b) => a + (Number(b) || 0), 0)
  const weekPct = sumSch ? Math.round((sumDone / sumSch) * 100) : 0

  const bestStreak = habits.reduce((m, h) => Math.max(m, h.currentStreak || 0), 0)
  const filtered = filter === 'all' ? habits : habits.filter((h) => h.scheduleType === filter)

  const groups = ['daily', 'weekdays', 'weekends', 'custom'].map((type) => ({
    type,
    items: filtered.filter((h) => h.scheduleType === type),
  })).filter((g) => g.items.length)

  const save = async (data) => {
    if (modal.habit?._id) {
      await habitService.update(modal.habit._id, data)
      toast.success('Habit updated')
    } else {
      await habitService.create(data)
      toast.success(`Habit "${data.name}" created`)
    }
    load()
  }

  if (loading) {
    return (
      <PageContent>
        <p className="text-[#9A8070]">Loading...</p>
      </PageContent>
    )
  }
  if (error) {
    return (
      <PageContent>
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">{error}</p>
      </PageContent>
    )
  }

  return (
    <PageContent>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <p className="text-sm text-[#9A8070]">{new Date().toLocaleDateString()}</p>
        {view === 'active' && (
          <Button onClick={() => setModal({ open: true, habit: null })} className="w-full sm:w-auto min-h-[44px]">
            New habit
          </Button>
        )}
      </header>

      <nav className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setView('active')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            view === 'active' ? 'bg-[#1C1917] text-white' : 'border border-[rgba(100,80,60,0.25)] text-[#8C6E52]'
          }`}
        >
          Active ({habits.length})
        </button>
        <button
          type="button"
          onClick={() => setView('archived')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            view === 'archived' ? 'bg-[#1C1917] text-white' : 'border border-[rgba(100,80,60,0.25)] text-[#8C6E52]'
          }`}
        >
          Archived ({archived.length})
        </button>
      </nav>

      {view === 'archived' ? (
        <section className="mb-8">
          {archived.length === 0 ? (
            <p className="text-center text-[#9A8070] py-12 bg-white border rounded-2xl">
              No archived habits. Archive a habit from the active list to see it here.
            </p>
          ) : (
            <ul className="space-y-3">
              {archived.map((h) => (
                <li
                  key={h._id}
                  className="bg-white border border-[rgba(100,80,60,0.12)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <section className="flex items-center gap-3 min-w-0 w-full">
                    <span className="text-2xl shrink-0">{h.icon}</span>
                    <section className="min-w-0">
                      <p className="font-medium truncate">{h.name}</p>
                      <p className="text-xs text-[#9A8070] capitalize">
                        {h.type === 'yesno' ? 'Yes/No' : h.type} · {h.scheduleType}
                        {h.updatedAt && ` · Archived ${new Date(h.updatedAt).toLocaleDateString()}`}
                      </p>
                    </section>
                  </section>
                  <section className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await habitService.unarchive(h._id)
                        toast.success(`"${h.name}" restored`)
                        load()
                      }}
                    >
                      Restore
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (window.confirm(`Permanently delete "${h.name}"?`)) {
                          await habitService.delete(h._id)
                          toast.success('Habit deleted')
                          load()
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </section>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-[#9A8070] mt-4">
            Archived habits are saved in your database (<code>isArchived: true</code>) and hidden from your daily list.
          </p>
        </section>
      ) : (
        <>
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <article className="bg-[#F2EDE6] rounded-xl p-3"><p className="text-xs text-[#9A8070]">Active</p><p className="font-mono text-xl">{habits.length}</p></article>
        <article className="bg-[#F2EDE6] rounded-xl p-3"><p className="text-xs text-[#9A8070]">Done today</p><p className="font-mono text-xl">{todayHabits.length}/{habits.length}</p></article>
        <article className="bg-[#F2EDE6] rounded-xl p-3"><p className="text-xs text-[#9A8070]">Best streak</p><p className="font-mono text-xl">🔥 {bestStreak}</p></article>
        <article className="bg-[#F2EDE6] rounded-xl p-3">
          <p className="text-xs text-[#9A8070]">This week</p>
          {weeklyLoading ? (
            <p className="font-mono text-xl animate-pulse text-[#C4A882]">...</p>
          ) : (
            <p className="font-mono text-xl">{weekPct}%</p>
          )}
        </article>
      </section>

      <nav className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-full text-sm capitalize min-h-[40px] ${
              filter === f ? 'bg-[#1C1917] text-white' : 'border border-[rgba(100,80,60,0.25)] text-[#8C6E52]'
            }`}
          >
            {f}
          </button>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <p className="text-center text-[#9A8070] py-12">No habits match this filter.</p>
      ) : (
        groups.map((g) => (
          <section key={g.type} className="mb-8">
            <h2 className="text-sm uppercase text-[#9A8070] mb-3">{g.type}</h2>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {g.items.map((h) => (
                <HabitCard
                  key={h._id}
                  habit={h}
                  onEdit={(habit) => setModal({ open: true, habit })}
                  onArchive={async (habit) => { await habitService.archive(habit._id); load() }}
                  onDelete={async (habit) => {
                    if (window.confirm('Delete this habit?')) {
                      await habitService.delete(habit._id)
                      load()
                    }
                  }}
                />
              ))}
            </section>
          </section>
        ))
      )}

      <HabitForm
        open={modal.open}
        initial={modal.habit}
        onClose={() => setModal({ open: false, habit: null })}
        onSave={save}
      />
        </>
      )}
    </PageContent>
  )
}
