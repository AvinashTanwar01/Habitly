const cron = require('node-cron')
const Habit = require('../models/habitModel')
const Completion = require('../models/completionModel')
const User = require('../models/userModel')
const GroupTask = require('../models/groupTaskModel')
const TaskCompletion = require('../models/taskCompletionModel')
const GroupMember = require('../models/groupMemberModel')
const InAppNotification = require('../models/inAppNotificationModel')
const { notifyUser } = require('./notifyUser')
const { getEffectiveToday, formatDate, isScheduled } = require('./streakUtils')
const { normalizeReminderTime, nowHHMM } = require('./reminderTimeUtils')

function dayStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetween(a, b) {
  return Math.round((dayStart(b) - dayStart(a)) / 86400000)
}

/** Avoid duplicate reminders if cron runs twice in the same minute */
async function alreadySentReminder(userId, habitId, title) {
  const since = new Date(Date.now() - 90 * 1000)
  const existing = await InAppNotification.findOne({
    userId,
    title,
    type: 'habit_reminder',
    createdAt: { $gte: since },
  }).lean()
  return !!existing
}

async function habitReminders() {
  const time = nowHHMM()
  const habits = await Habit.find({ isArchived: false, reminderTime: { $exists: true, $ne: '' } })
  for (const habit of habits) {
    if (normalizeReminderTime(habit.reminderTime) !== time) continue

    const user = await User.findById(habit.userId)
    if (!user) continue

    const today = getEffectiveToday(new Date(), user.resetTime)
    if (!isScheduled(today, habit.scheduleType, habit.scheduleDays)) continue

    const done = await Completion.findOne({
      habitId: habit._id,
      userId: user._id,
      date: today,
      isDone: true,
    })
    if (done) continue

    const title = `Reminder: ${habit.name}`
    if (await alreadySentReminder(user._id, habit._id, title)) continue

    await notifyUser(user._id, {
      type: 'habit_reminder',
      title,
      body: `Time for your habit — ${habit.icon || '🌱'} ${habit.name}`,
      url: '/dashboard',
    })
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[reminder] ${time} → ${user.email} — ${habit.name}`)
    }
  }
}

async function incompleteHabitsEvening() {
  if (nowHHMM() !== '20:00') return
  const users = await User.find()
  for (const user of users) {
    const today = getEffectiveToday(new Date(), user.resetTime)
    const habits = await Habit.find({ userId: user._id, isArchived: false })
    let incomplete = 0
    for (const h of habits) {
      if (!isScheduled(today, h.scheduleType, h.scheduleDays)) continue
      const done = await Completion.findOne({ habitId: h._id, userId: user._id, date: today, isDone: true })
      if (!done) incomplete++
    }
    if (incomplete > 0) {
      const title = "Don't break your streak! 🔥"
      if (await alreadySentReminder(user._id, null, title)) continue
      await notifyUser(user._id, {
        type: 'habit_reminder',
        title,
        body: `You still have ${incomplete} habit(s) to complete today.`,
        url: '/dashboard',
      })
    }
  }
}

async function taskDeadlineReminders() {
  const tasks = await GroupTask.find({ deadline: { $exists: true } })
  const today = formatDate(new Date())
  for (const task of tasks) {
    const deadlineStr = formatDate(new Date(task.deadline))
    const days = daysBetween(new Date(today), new Date(deadlineStr))
    let message = null
    if (days === 3) message = `3 days left: ${task.title}`
    else if (days === 1) message = `Due tomorrow: ${task.title} ⚠️`
    else if (days === 0) message = `Due today: ${task.title} 🔴`
    else if (days < 0) message = `Overdue: ${task.title} — please complete it`
    if (!message) continue

    const members = await GroupMember.find({ groupId: task.groupId })
    for (const m of members) {
      if (task.assignedTo && String(task.assignedTo) !== String(m.userId)) continue
      const done = await TaskCompletion.findOne({ taskId: task._id, userId: m.userId })
      if (!done) {
        await notifyUser(m.userId, {
          type: 'group_task',
          title: 'Group task reminder',
          body: message,
          url: `/groups/${task.groupId}`,
        })
      }
    }
  }
}

async function normalizeStoredReminderTimes() {
  const habits = await Habit.find({ reminderTime: { $exists: true } })
  for (const h of habits) {
    const n = normalizeReminderTime(h.reminderTime)
    if (n !== h.reminderTime) {
      await Habit.updateOne({ _id: h._id }, { reminderTime: n })
    }
  }
}

function startScheduler() {
  normalizeStoredReminderTimes().catch((e) => console.warn('[reminder] normalize times:', e.message))

  cron.schedule('* * * * *', async () => {
    try {
      await habitReminders()
      await incompleteHabitsEvening()
    } catch (e) {
      console.error('Habit scheduler error:', e.message)
    }
  })

  cron.schedule('0 8 * * *', async () => {
    try {
      await taskDeadlineReminders()
    } catch (e) {
      console.error('Task scheduler error:', e.message)
    }
  })

  console.warn('Notification scheduler started (habit reminders every minute)')
}

module.exports = { startScheduler, habitReminders }
