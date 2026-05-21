const Habit = require('../models/habitModel')
const Completion = require('../models/completionModel')
const { calcStreak, isScheduled, getEffectiveToday, addDays } = require('../utils/streakUtils')
const { normalizeReminderTime } = require('../utils/reminderTimeUtils')

function withNormalizedReminder(body) {
  const data = { ...body }
  if (data.reminderTime != null) {
    data.reminderTime = normalizeReminderTime(data.reminderTime)
  }
  return data
}

const QUERY_MS = 8000

function groupCompletionsByHabit(completions) {
  const map = new Map()
  for (const c of completions) {
    const key = String(c.habitId)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(c)
  }
  return map
}

exports.getAll = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id, isArchived: false })
      .sort({ createdAt: -1 })
      .lean()
      .maxTimeMS(QUERY_MS)
    if (habits.length === 0) return res.json([])

    const habitIds = habits.map((h) => h._id)
    const allCompletions = await Completion.find({ userId: req.user._id, habitId: { $in: habitIds } })
      .lean()
      .maxTimeMS(QUERY_MS)
    const byHabit = groupCompletionsByHabit(allCompletions)

    const result = habits.map((h) => {
      const completions = byHabit.get(String(h._id)) || []
      const streak = calcStreak(
        completions,
        h.scheduleType,
        h.scheduleDays,
        req.user.resetTime,
        h.streakCountsOnScheduledDaysOnly,
      )
      return { ...h, ...streak, completions }
    })
    res.json(result)
  } catch (e) {
    console.error('getAll habits error:', e.message)
    res.status(500).json({ message: e.message })
  }
}

exports.getOne = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id }).maxTimeMS(QUERY_MS)
    if (!habit) return res.status(404).json({ message: 'Not found' })
    const since = addDays(getEffectiveToday(new Date(), req.user.resetTime), -60)
    const completions = await Completion.find({
      habitId: habit._id,
      userId: req.user._id,
      date: { $gte: since },
    })
      .sort({ date: -1 })
      .lean()
      .maxTimeMS(QUERY_MS)
    const today = getEffectiveToday(new Date(), req.user.resetTime)
    const todayCompletion = completions.find((c) => c.date === today) || null
    const streak = calcStreak(
      completions,
      habit.scheduleType,
      habit.scheduleDays,
      req.user.resetTime,
      habit.streakCountsOnScheduledDaysOnly,
    )
    res.json({ habit, completions, todayCompletion, ...streak })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getCompletions = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id }).maxTimeMS(QUERY_MS)
    if (!habit) return res.status(404).json({ message: 'Not found' })
    const since = addDays(getEffectiveToday(new Date(), req.user.resetTime), -60)
    const completions = await Completion.find({
      habitId: habit._id,
      userId: req.user._id,
      date: { $gte: since },
    })
      .sort({ date: -1 })
      .maxTimeMS(QUERY_MS)
    res.json(completions)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getToday = async (req, res) => {
  try {
    const today = getEffectiveToday(new Date(), req.user.resetTime)
    const habits = await Habit.find({ userId: req.user._id, isArchived: false }).lean().maxTimeMS(QUERY_MS)
    const scheduled = habits.filter((h) => isScheduled(today, h.scheduleType, h.scheduleDays))
    if (scheduled.length === 0) return res.json([])

    const habitIds = scheduled.map((h) => h._id)
    const allCompletions = await Completion.find({ userId: req.user._id, habitId: { $in: habitIds } })
      .lean()
      .maxTimeMS(QUERY_MS)
    const byHabit = groupCompletionsByHabit(allCompletions)

    const result = scheduled.map((h) => {
      const completions = byHabit.get(String(h._id)) || []
      const completion = completions.find((c) => c.date === today) || null
      const streak = calcStreak(
        completions,
        h.scheduleType,
        h.scheduleDays,
        req.user.resetTime,
        h.streakCountsOnScheduledDaysOnly,
      )
      return {
        ...h,
        ...streak,
        completion,
        isDone: completion?.isDone || false,
        actualAmount: completion?.actualAmount,
      }
    })
    res.json(result)
  } catch (e) {
    console.error('getToday habits error:', e.message)
    res.status(500).json({ message: e.message })
  }
}

exports.create = async (req, res) => {
  try {
    const habit = await Habit.create({ ...withNormalizedReminder(req.body), userId: req.user._id })
    res.status(201).json(habit)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.update = async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      withNormalizedReminder(req.body),
      { new: true },
    )
    if (!habit) return res.status(404).json({ message: 'Not found' })
    res.json(habit)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.delete = async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!habit) return res.status(404).json({ message: 'Not found' })
    await Completion.deleteMany({ habitId: req.params.id })
    res.json({ message: 'Deleted' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.archive = async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isArchived: true },
      { new: true },
    )
    if (!habit) return res.status(404).json({ message: 'Not found' })
    res.json(habit)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.archiveAll = async (req, res) => {
  try {
    const result = await Habit.updateMany({ userId: req.user._id, isArchived: false }, { isArchived: true })
    res.json({ message: 'All habits archived', archivedCount: result.modifiedCount })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getArchived = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id, isArchived: true })
      .sort({ updatedAt: -1 })
      .lean()
      .maxTimeMS(QUERY_MS)
    res.json(habits)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.unarchive = async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, isArchived: true },
      { isArchived: false },
      { new: true },
    )
    if (!habit) return res.status(404).json({ message: 'Archived habit not found' })
    res.json(habit)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.complete = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id })
    if (!habit) return res.status(404).json({ message: 'Not found' })
    const date = req.body.date || getEffectiveToday(new Date(), req.user.resetTime)
    const actualAmount = req.body.actualAmount ?? (habit.type === 'yesno' ? 1 : habit.target)
    const isDone = actualAmount >= habit.target
    const completion = await Completion.findOneAndUpdate(
      { habitId: habit._id, userId: req.user._id, date },
      { isDone, actualAmount },
      { upsert: true, new: true },
    )
    res.json(completion)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.uncomplete = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id })
    if (!habit) return res.status(404).json({ message: 'Not found' })
    const date = req.body.date || getEffectiveToday(new Date(), req.user.resetTime)
    const completion = await Completion.findOneAndUpdate(
      { habitId: habit._id, userId: req.user._id, date },
      { isDone: false, actualAmount: 0 },
      { upsert: true, new: true },
    )
    res.json(completion)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}
