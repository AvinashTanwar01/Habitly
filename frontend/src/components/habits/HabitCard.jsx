import { useNavigate } from 'react-router-dom'
import { calcStreak, completionRate } from '../../utils/streakUtils'
import { useAuth } from '../../context/AuthContext'

function formatValue(val, type) {
  if (type !== 'time') return val
  const h = Math.floor(val / 60)
  const m = val % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export default function HabitCard({ habit, onEdit, onArchive, onDelete }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const completions = habit.completions || []
  const streak = calcStreak(
    completions,
    habit.scheduleType,
    habit.scheduleDays,
    user?.resetTime,
    habit.streakCountsOnScheduledDaysOnly
  )
  const rate = completionRate(completions, habit.scheduleType, habit.scheduleDays)

  return (
    <article
      className="bg-white border border-[rgba(100,80,60,0.12)] rounded-xl overflow-hidden cursor-pointer"
      onClick={() => navigate(`/habits/${habit._id}`)}
    >
      <section className="flex" style={{ borderLeft: `3px solid ${habit.color}` }}>
        <section className="p-4 flex-1">
          <header className="flex items-start gap-3 mb-3">
            <span className="w-10 h-10 bg-[#F2EDE6] rounded-lg flex items-center justify-center text-xl">{habit.icon}</span>
            <section className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{habit.name}</h3>
              <p className="text-xs text-[#9A8070] capitalize">
                {habit.type === 'yesno' ? 'Yes/No' : habit.type}
                {habit.type !== 'yesno' ? ` · ${formatValue(habit.target, habit.type)}` : ''}
              </p>
            </section>
            <section className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => onEdit(habit)} className="p-1.5 border border-[rgba(100,80,60,0.2)] rounded-lg text-[#8C6E52]"><i className="ti ti-edit" /></button>
              <button type="button" onClick={() => onArchive(habit)} className="p-1.5 border border-[rgba(100,80,60,0.2)] rounded-lg text-[#8C6E52]"><i className="ti ti-archive" /></button>
              <button type="button" onClick={() => onDelete(habit)} className="p-1.5 border border-[rgba(100,80,60,0.2)] rounded-lg text-[#8C6E52]"><i className="ti ti-trash" /></button>
            </section>
          </header>
          <section className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
            <section className="bg-[#FAF8F5] rounded-lg p-2"><p className="text-[#9A8070]">Current</p><p className="font-mono">🔥 {streak.currentStreak}</p></section>
            <section className="bg-[#FAF8F5] rounded-lg p-2"><p className="text-[#9A8070]">Longest</p><p className="font-mono">{streak.longestStreak}</p></section>
            <section className="bg-[#FAF8F5] rounded-lg p-2"><p className="text-[#9A8070]">Done</p><p className="font-mono">{streak.totalDone}</p></section>
          </section>
          <section className="mb-2">
            <section className="flex justify-between text-xs mb-1"><span>Progress</span><span>{rate}%</span></section>
            <section className="h-1.5 bg-[#EDE5DB] rounded-full"><section className="h-full bg-[#8C6E52] rounded-full" style={{ width: `${rate}%` }} /></section>
          </section>
          <footer className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-[#9A8070]">
            <span><i className="ti ti-bell" /> {habit.reminderTime} · {habit.scheduleType}</span>
            <span className="shrink-0">Since {new Date(habit.createdAt).toLocaleDateString()}</span>
          </footer>
        </section>
      </section>
    </article>
  )
}
