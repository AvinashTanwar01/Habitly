const GroupTask = require('../models/groupTaskModel')
const TaskCompletion = require('../models/taskCompletionModel')
const GroupMember = require('../models/groupMemberModel')
const Group = require('../models/groupModel')
const User = require('../models/userModel')
const { notifyUser } = require('../utils/notifyUser')

async function assertMember(groupId, userId) {
  const m = await GroupMember.findOne({ groupId, userId })
  if (!m) throw new Error('NOT_MEMBER')
  return m
}

async function assertLeader(groupId, userId) {
  const m = await GroupMember.findOne({ groupId, userId, role: 'leader' })
  if (!m) throw new Error('NOT_LEADER')
  return m
}

async function enrichTasks(groupId, userId) {
  const membership = await GroupMember.findOne({ groupId, userId })
  const tasks = await GroupTask.find({ groupId }).sort({ deadline: 1 })
  const members = await GroupMember.find({ groupId })
  const memberUsers = await User.find({ _id: { $in: members.map((m) => m.userId) } }).select('displayName')

  return Promise.all(tasks.map(async (task) => {
    if (membership?.role !== 'leader') {
      if (task.assignedTo && String(task.assignedTo) !== String(userId)) {
        return null
      }
    }
    const completions = await TaskCompletion.find({ taskId: task._id })
    const assignee = task.assignedTo
      ? memberUsers.find((u) => String(u._id) === String(task.assignedTo))
      : null
    const myDone = completions.some((c) => String(c.userId) === String(userId))
    return {
      ...task.toObject(),
      assignedToName: assignee?.displayName || 'Everyone',
      completionCount: completions.length,
      memberCount: members.length,
      completions: completions.map((c) => ({
        userId: c.userId,
        completedAt: c.completedAt,
        completedEarly: c.completedEarly,
      })),
      isDone: myDone,
    }
  })).then((list) => list.filter(Boolean))
}

exports.getByGroup = async (req, res) => {
  try {
    await assertMember(req.params.groupId, req.user._id)
    res.json(await enrichTasks(req.params.groupId, req.user._id))
  } catch (e) {
    if (e.message === 'NOT_MEMBER') return res.status(403).json({ message: 'Not a member' })
    res.status(500).json({ message: e.message })
  }
}

exports.create = async (req, res) => {
  try {
    await assertLeader(req.params.groupId, req.user._id)
    const task = await GroupTask.create({
      groupId: req.params.groupId,
      title: req.body.title,
      description: req.body.description || '',
      deadline: req.body.deadline,
      assignedTo: req.body.assignedTo || null,
      createdBy: req.user._id,
    })
    const group = await Group.findById(req.params.groupId).select('name')
    const members = await GroupMember.find({ groupId: req.params.groupId })
    const leaderName = req.user.displayName || 'Leader'
    const deadlineStr = new Date(task.deadline).toLocaleDateString()
    void Promise.allSettled(
      members.map((m) => {
        if (task.assignedTo && String(task.assignedTo) !== String(m.userId)) return Promise.resolve()
        if (String(m.userId) === String(req.user._id)) return Promise.resolve()
        return notifyUser(m.userId, {
          type: 'task',
          title: 'New group task',
          body: `${leaderName} created "${task.title}" in ${group?.name || 'your group'} (due ${deadlineStr})`,
          url: `/groups/${req.params.groupId}`,
        })
      })
    )
    res.status(201).json(task)
  } catch (e) {
    if (e.message === 'NOT_LEADER') return res.status(403).json({ message: 'Leader only' })
    res.status(500).json({ message: e.message })
  }
}

exports.update = async (req, res) => {
  try {
    const task = await GroupTask.findById(req.params.id)
    if (!task) return res.status(404).json({ message: 'Not found' })
    await assertLeader(task.groupId, req.user._id)
    Object.assign(task, req.body)
    await task.save()
    res.json(task)
  } catch (e) {
    if (e.message === 'NOT_LEADER') return res.status(403).json({ message: 'Leader only' })
    res.status(500).json({ message: e.message })
  }
}

exports.delete = async (req, res) => {
  try {
    const task = await GroupTask.findById(req.params.id)
    if (!task) return res.status(404).json({ message: 'Not found' })
    await assertLeader(task.groupId, req.user._id)
    await TaskCompletion.deleteMany({ taskId: task._id })
    await task.deleteOne()
    res.json({ message: 'Deleted' })
  } catch (e) {
    if (e.message === 'NOT_LEADER') return res.status(403).json({ message: 'Leader only' })
    res.status(500).json({ message: e.message })
  }
}

exports.complete = async (req, res) => {
  try {
    const task = await GroupTask.findById(req.params.id)
    if (!task) return res.status(404).json({ message: 'Not found' })
    await assertMember(task.groupId, req.user._id)
    if (task.assignedTo && String(task.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Task not assigned to you' })
    }
    const now = new Date()
    const completedEarly = now < new Date(task.deadline)
    const completion = await TaskCompletion.findOneAndUpdate(
      { taskId: task._id, userId: req.user._id },
      { completedAt: now, completedEarly },
      { upsert: true, new: true }
    )
    if (completedEarly) {
      const group = await Group.findById(task.groupId)
      if (group) {
        const member = await User.findById(req.user._id).select('displayName')
        await sendToUser(group.leaderId, {
          title: '⚡ Early completion!',
          body: `${member?.displayName || 'Someone'} completed '${task.title}' ahead of schedule!`,
          url: `/groups/${task.groupId}/leader`,
        })
      }
    }
    res.json(completion)
  } catch (e) {
    if (e.message === 'NOT_MEMBER') return res.status(403).json({ message: 'Not a member' })
    res.status(500).json({ message: e.message })
  }
}
