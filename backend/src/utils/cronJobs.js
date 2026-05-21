const cron = require('node-cron')
const Habit = require('../models/habitModel')
const Completion = require('../models/completionModel')
const User = require('../models/userModel')
const GroupTask = require('../models/groupTaskModel')
const TaskCompletion = require('../models/taskCompletionModel')
const GroupMember = require('../models/groupMemberModel')
const { sendToUser, isPushConfigured } = require('./pushUtils')
const { getEffectiveToday, formatDate } = require('./streakUtils')

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function daysUntil(deadline) {
  const today = formatDate(new Date())
  const d1 = new Date(today)
  const d2 = new Date(deadline.toISOString().split('T')[0])
  return Math.round((d2 - d1) / 86400000)
}

async function runHabitReminders() {
  if (!isPushConfigured()) return
  const time = nowHHMM()
  const habits = await Habit.find({ isArchived: false, reminderTime: time })
  for (const habit of habits) {
    const user = await User.findById(habit.userId)
    if (!user) continue
    const today = getEffectiveToday(new Date(), user.resetTime)
    const done = await Completion.findOne({ habitId: habit._id, userId: user._id, date: today, isDone: true })
    if (!done) {
      await sendToUser(user._id, {
        title: 'Habitly reminder',
        body: `Time for: ${habit.name}`,
        url: '/dashboard',
      })
    }
  }
}

async function runTaskReminders() {
  if (!isPushConfigured()) return
  const tasks = await GroupTask.find({ deadline: { $gte: new Date() } })
  for (const task of tasks) {
    const days = daysUntil(task.deadline)
    if (![0, 1, 3].includes(days)) continue
    const members = await GroupMember.find({ groupId: task.groupId })
    for (const m of members) {
      if (task.assignedTo && String(task.assignedTo) !== String(m.userId)) continue
      const done = await TaskCompletion.findOne({ taskId: task._id, userId: m.userId })
      if (!done) {
        await sendToUser(m.userId, {
          title: 'Group task reminder',
          body: `${task.title} — ${days === 0 ? 'due today' : `${days} day(s) left`}`,
          url: `/groups/${task.groupId}`,
        })
      }
    }
  }
}

function startCronJobs() {
  cron.schedule('* * * * *', async () => {
    try {
      await runHabitReminders()
      await runTaskReminders()
    } catch (e) {
      console.error('Cron error:', e.message)
    }
  })
}

module.exports = { startCronJobs, sendToUser }
