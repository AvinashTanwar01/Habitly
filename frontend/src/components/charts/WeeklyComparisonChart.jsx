import { useMemo } from 'react'

const CHART_HEIGHT = 120

function barHeight(count, max) {
  if (!count || count <= 0) return 8
  return Math.max(12, Math.round((count / max) * CHART_HEIGHT))
}

function dayTooltip(col) {
  const parts = [
    `${col.label}${col.isToday ? ' (today)' : ''}`,
    `This week: ${col.tw} completed`,
    `Last week: ${col.lw} completed`,
  ]
  if (col.sched) parts.push(`Scheduled: ${col.sched}`)
  return parts.join('\n')
}

export default function WeeklyComparisonChart({ weekly }) {
  const days = weekly?.days?.length === 7 ? weekly.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const thisWeek = weekly?.thisWeek?.length === 7 ? weekly.thisWeek : [0, 0, 0, 0, 0, 0, 0]
  const lastWeek = weekly?.lastWeek?.length === 7 ? weekly.lastWeek : [0, 0, 0, 0, 0, 0, 0]
  const todayIdx = typeof weekly?.todayWeekIndex === 'number' ? weekly.todayWeekIndex : -1

  const columns = useMemo(() => {
    return days.map((label, i) => ({
      label,
      tw: thisWeek[i] || 0,
      lw: lastWeek[i] || 0,
      isToday: i === todayIdx,
    }))
  }, [days, thisWeek, lastWeek, todayIdx])

  const maxBar = Math.max(...columns.map((c) => Math.max(c.tw, c.lw, 1)), 1)

  return (
    <div>
      <div className="flex items-center justify-center gap-6 text-xs text-[#9A8070] mb-5">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded-sm bg-[#EDE5DB] border border-[rgba(100,80,60,0.15)]" />
          Last week
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded-sm bg-[#8C6E52]" />
          This week
        </span>
      </div>

      <div className="flex items-end justify-between gap-1 sm:gap-2 px-1">
        {columns.map((col) => (
          <div
            key={col.label}
            className={`flex-1 flex flex-col items-center min-w-0 rounded-lg py-1 transition-colors hover:bg-[#F2EDE6]/80 ${
              col.isToday ? 'ring-1 ring-[#C4A882]/50' : ''
            }`}
            title={dayTooltip(col)}
          >
            <div
              className="flex items-end justify-center gap-1.5 w-full"
              style={{ height: CHART_HEIGHT }}
            >
              <div
                className="w-4 sm:w-5 shrink-0 bg-[#EDE5DB] rounded-t border border-[rgba(100,80,60,0.12)]"
                style={{ height: barHeight(col.lw, maxBar) }}
                aria-hidden
              />
              <div
                className="w-4 sm:w-5 shrink-0 bg-[#8C6E52] rounded-t"
                style={{ height: barHeight(col.tw, maxBar) }}
                aria-hidden
              />
            </div>
            <span
              className={`text-[10px] mt-2 font-medium ${
                col.isToday ? 'text-[#8C6E52]' : 'text-[#9A8070]'
              }`}
            >
              {col.label}
            </span>
            <span className="text-[9px] font-mono text-[#C4A882] tabular-nums">
              {col.tw}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#9A8070] text-center mt-4">
        Hover a day to see last week vs this week. Taller bar = more habits completed.
      </p>
    </div>
  )
}
