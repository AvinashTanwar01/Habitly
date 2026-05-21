const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

function getEffectiveToday(now = new Date(), userResetTime = '00:00') {
  const [h, m] = (userResetTime || '00:00').split(':').map(Number)
  const d = new Date(now)
  const boundary = new Date(d)
  boundary.setHours(h, m, 0, 0)
  if (d < boundary) d.setDate(d.getDate() - 1)
  return formatDate(d)
}

/** Monday (calendar week) of the week containing effectiveToday (YYYY-MM-DD). */
function mondayOfWeekContaining(effectiveTodayStr) {
  const [y, m, d] = effectiveTodayStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = dt.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  dt.setDate(dt.getDate() + offset)
  return formatDate(dt)
}

function isScheduled(dateStr, scheduleType, scheduleDays = []) {
  const d = parseDate(dateStr)
  const dow = d.getDay()
  const short = DAY_NAMES[dow]
  switch (scheduleType) {
    case 'daily': return true
    case 'weekdays': return dow >= 1 && dow <= 5
    case 'weekends': return dow === 0 || dow === 6
    case 'custom':
      if (!scheduleDays.length) return false
      return scheduleDays.includes(short)
    default: return true
  }
}

function getScheduledDates(startStr, endStr, scheduleType, scheduleDays = []) {
  const dates = []
  let cur = startStr
  while (cur <= endStr) {
    if (isScheduled(cur, scheduleType, scheduleDays)) dates.push(cur)
    cur = addDays(cur, 1)
  }
  return dates
}

function calcStreak(
  completions = [],
  scheduleType = 'daily',
  scheduleDays = [],
  userResetTime = '00:00',
  onlyScheduled = true
) {
  const doneSet = new Set(completions.filter((c) => c.isDone).map((c) => c.date))
  const today = getEffectiveToday(new Date(), userResetTime)

  const allDates = [...doneSet].sort()
  const start = allDates[0] || addDays(today, -365)
  const scheduled = getScheduledDates(start, today, scheduleType, scheduleDays)
  const totalDone = scheduled.filter((d) => doneSet.has(d)).length

  let longest = 0
  let run = 0
  for (const date of scheduled) {
    if (doneSet.has(date)) {
      run++
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }

  let current = 0
  let cursor = today
  if (!doneSet.has(cursor)) {
    cursor = addDays(cursor, -1)
    let guard = 0
    while (onlyScheduled && !isScheduled(cursor, scheduleType, scheduleDays) && guard++ < 400) {
      cursor = addDays(cursor, -1)
    }
  }
  let guard = 0
  while (doneSet.has(cursor) && guard++ < 400) {
    current++
    let prev = addDays(cursor, -1)
    let inner = 0
    while (onlyScheduled && !isScheduled(prev, scheduleType, scheduleDays) && inner++ < 400) {
      prev = addDays(prev, -1)
    }
    cursor = prev
  }

  return { currentStreak: current, longestStreak: longest, totalDone }
}

module.exports = {
  calcStreak,
  isScheduled,
  formatDate,
  addDays,
  getEffectiveToday,
  getScheduledDates,
  DAY_NAMES,
  mondayOfWeekContaining,
}
