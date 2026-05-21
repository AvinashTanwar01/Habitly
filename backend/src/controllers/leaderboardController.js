const User = require('../models/userModel')
const Habit = require('../models/habitModel')
const Completion = require('../models/completionModel')
const { calcStreak, isScheduled, addDays, getEffectiveToday, mondayOfWeekContaining } = require('../utils/streakUtils')

let leaderboardCache = { data: null, expires: 0 }

function habitCategory(name = '') {
  const n = name.toLowerCase()
  if (/read|study|book|learn|code|course/.test(n)) return 'Study'
  if (/run|gym|workout|exercise|walk|fitness|sport/.test(n)) return 'Fitness'
  return 'Wellness'
}

async function buildLeaderboard() {
  const users = await User.find().select('displayName resetTime profileImage').limit(200).lean().maxTimeMS(5000)
  if (!users.length) return []

  const userIds = users.map((u) => u._id)
  const resetByUser = new Map(users.map((u) => [String(u._id), u.resetTime || '00:00']))
  const nameByUser = new Map(users.map((u) => [String(u._id), u.displayName]))
  const imageByUser = new Map(users.map((u) => [String(u._id), u.profileImage || '']))

  const habits = await Habit.find({ userId: { $in: userIds }, isArchived: false })
    .select('userId name scheduleType scheduleDays streakCountsOnScheduledDaysOnly')
    .lean()
    .maxTimeMS(8000)

  const habitIds = habits.map((h) => h._id)
  const completions = habitIds.length
    ? await Completion.find({
        habitId: { $in: habitIds },
        userId: { $in: userIds },
        isDone: true,
      })
        .select('habitId userId date isDone')
        .lean()
        .maxTimeMS(10000)
    : []

  const compsByHabit = new Map()
  for (const c of completions) {
    const key = String(c.habitId)
    if (!compsByHabit.has(key)) compsByHabit.set(key, [])
    compsByHabit.get(key).push(c)
  }

  const bestByUser = new Map()
  for (const h of habits) {
    const uid = String(h.userId)
    const comps = compsByHabit.get(String(h._id)) || []
    const streak = calcStreak(
      comps,
      h.scheduleType,
      h.scheduleDays,
      resetByUser.get(uid),
      h.streakCountsOnScheduledDaysOnly,
    )
    const prev = bestByUser.get(uid)
    if (!prev || streak.currentStreak > prev.streak) {
      bestByUser.set(uid, { streak: streak.currentStreak, category: habitCategory(h.name) })
    }
  }

  const rows = users.map((user) => {
    const uid = String(user._id)
    const best = bestByUser.get(uid)
    return {
      id: uid,
      userId: uid,
      displayName: nameByUser.get(uid) || 'Anonymous',
      profileImage: imageByUser.get(uid) || '',
      streak: best?.streak ?? 0,
      habitCategory: best?.category ?? 'Wellness',
    }
  })

  return rows.sort((a, b) => b.streak - a.streak).slice(0, 100)
}

exports.getLeaderboard = async (req, res) => {
  try {
    if (leaderboardCache.data?.length && Date.now() < leaderboardCache.expires) {
      return res.json(leaderboardCache.data)
    }
    const data = await Promise.race([
      buildLeaderboard(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000)),
    ])
    if (data.length) {
      leaderboardCache = { data, expires: Date.now() + 10 * 60 * 1000 }
    }
    res.json(data)
  } catch (e) {
    console.error('getLeaderboard error:', e.message)
    if (leaderboardCache.data?.length) {
      return res.json(leaderboardCache.data)
    }
    res.status(503).json({ message: 'Leaderboard is temporarily unavailable. Please try again.' })
  }
}

exports.getStreak = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.habitId, userId: req.user._id })
    if (!habit) return res.status(404).json({ message: 'Not found' })
    const completions = await Completion.find({ habitId: habit._id, userId: req.user._id })
    res.json(calcStreak(completions, habit.scheduleType, habit.scheduleDays, req.user.resetTime, habit.streakCountsOnScheduledDaysOnly))
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getWeekly = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id, isArchived: false }).lean().maxTimeMS(8000)
    const today = getEffectiveToday(new Date(), req.user.resetTime)
    const monday = mondayOfWeekContaining(today)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const thisWeek = []
    const lastWeek = []
    const scheduledThisWeek = []
    const scheduledLastWeek = []
    let todayWeekIndex = -1

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      weekDates.push(addDays(monday, i))
      weekDates.push(addDays(monday, i - 7))
    }

    const habitIds = habits.map((h) => h._id)
    const doneCompletions = habitIds.length
      ? await Completion.find({
          userId: req.user._id,
          habitId: { $in: habitIds },
          date: { $in: weekDates },
          isDone: true,
        })
          .select('habitId date')
          .lean()
          .maxTimeMS(8000)
      : []

    const doneSet = new Set(doneCompletions.map((c) => `${c.habitId}:${c.date}`))

    const habitBreakdown = habits.map((h) => {
      const thisWeekDays = []
      const lastWeekDays = []
      for (let i = 0; i < 7; i++) {
        const date = addDays(monday, i)
        const lastDate = addDays(monday, i - 7)
        const sched = isScheduled(date, h.scheduleType, h.scheduleDays)
        const schedL = isScheduled(lastDate, h.scheduleType, h.scheduleDays)
        thisWeekDays.push({
          scheduled: sched,
          completed: sched && doneSet.has(`${h._id}:${date}`),
        })
        lastWeekDays.push({
          scheduled: schedL,
          completed: schedL && doneSet.has(`${h._id}:${lastDate}`),
        })
      }
      return {
        id: String(h._id),
        name: h.name,
        icon: h.icon || '🌱',
        color: h.color || '',
        thisWeekDays,
        lastWeekDays,
      }
    })

    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i)
      const lastDate = addDays(monday, i - 7)
      if (date === today) todayWeekIndex = i
      let tw = 0
      let lw = 0
      let sw = 0
      let sl = 0
      for (const h of habits) {
        if (isScheduled(date, h.scheduleType, h.scheduleDays)) {
          sw++
          if (doneSet.has(`${h._id}:${date}`)) tw++
        }
        if (isScheduled(lastDate, h.scheduleType, h.scheduleDays)) {
          sl++
          if (doneSet.has(`${h._id}:${lastDate}`)) lw++
        }
      }
      thisWeek.push(tw)
      lastWeek.push(lw)
      scheduledThisWeek.push(sw)
      scheduledLastWeek.push(sl)
    }
    res.json({
      thisWeek,
      lastWeek,
      days,
      scheduledThisWeek,
      scheduledLastWeek,
      todayWeekIndex,
      habitBreakdown,
    })
  } catch (e) {
    console.error('getWeekly error:', e.message)
    res.status(500).json({ message: e.message })
  }
}

exports.getSummary = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id, isArchived: false }).lean().maxTimeMS(5000)
    const habitIds = habits.map((h) => h._id)
    const completions = habitIds.length
      ? await Completion.find({ userId: req.user._id, habitId: { $in: habitIds }, isDone: true })
          .lean()
          .maxTimeMS(8000)
      : []
    const compsByHabit = new Map()
    for (const c of completions) {
      const key = String(c.habitId)
      if (!compsByHabit.has(key)) compsByHabit.set(key, [])
      compsByHabit.get(key).push(c)
    }
    let bestCurrent = 0
    let bestAll = 0
    for (const h of habits) {
      const dates = compsByHabit.get(String(h._id)) || []
      const s = calcStreak(dates, h.scheduleType, h.scheduleDays, req.user.resetTime, h.streakCountsOnScheduledDaysOnly)
      bestCurrent = Math.max(bestCurrent, s.currentStreak)
      bestAll = Math.max(bestAll, s.longestStreak)
    }
    res.json({
      totalHabits: habits.length,
      totalCompletions: completions.length,
      bestCurrentStreak: bestCurrent,
      allTimeBestStreak: bestAll,
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getLandingStats = async (req, res) => {
  try {
    const [leaderboard, habits, completions] = await Promise.all([
      Promise.race([
        buildLeaderboard(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ]).catch(() => leaderboardCache.data || []),
      Habit.countDocuments({ isArchived: false }).maxTimeMS(5000),
      Completion.countDocuments({ isDone: true }).maxTimeMS(5000),
    ])
    res.json({
      habitsTracked: habits,
      activeStreaks: leaderboard.filter((r) => r.streak > 0).length,
      longestStreak: leaderboard[0]?.streak || 0,
      totalCompletions: completions,
    })
  } catch (e) {
    console.error('getLandingStats error:', e.message)
    res.status(500).json({ message: e.message })
  }
}
