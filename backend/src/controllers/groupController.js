const Group = require('../models/groupModel')
const GroupMember = require('../models/groupMemberModel')
const GroupTask = require('../models/groupTaskModel')
const GroupNote = require('../models/groupNoteModel')
const TaskCompletion = require('../models/taskCompletionModel')
const User = require('../models/userModel')
const { notifyUser } = require('../utils/notifyUser')
const crypto = require('crypto')

const MAX_MEMBERS = 15
const MAX_GROUPS_PER_MONTH = 3
const MIN_GROUP_NAME = 3
const MAX_GROUP_NAME = 50

function validateGroupName(name) {
  const trimmed = (name || '').trim()
  if (trimmed.length < MIN_GROUP_NAME) {
    return `Group name must be at least ${MIN_GROUP_NAME} characters`
  }
  if (trimmed.length > MAX_GROUP_NAME) {
    return `Group name must be at most ${MAX_GROUP_NAME} characters`
  }
  return null
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase()
}

async function isGroupLeader(group, userId) {
  if (String(group.leaderId) === String(userId)) return true
  const m = await GroupMember.findOne({ groupId: group._id, userId })
  return m?.role === 'leader'
}

function monthStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

async function groupsCreatedThisMonth(userId) {
  return Group.countDocuments({ leaderId: userId, createdAt: { $gte: monthStart() } })
}

async function deleteGroupCascade(groupId) {
  const tasks = await GroupTask.find({ groupId })
  const taskIds = tasks.map((t) => t._id)
  if (taskIds.length) {
    await TaskCompletion.deleteMany({ taskId: { $in: taskIds } })
  }
  await GroupTask.deleteMany({ groupId })
  await GroupNote.deleteMany({ groupId })
  await GroupMember.deleteMany({ groupId })
  await Group.findByIdAndDelete(groupId)
}

async function enrichGroup(group, userId) {
  const members = await GroupMember.find({ groupId: group._id }).populate('userId', 'displayName email')
  const tasks = await GroupTask.find({ groupId: group._id })
  const notes = await GroupNote.find({ groupId: group._id }).sort({ createdAt: -1 })
  const membership = members.find((m) => String(m.userId._id || m.userId) === String(userId))

  const tasksWithStatus = await Promise.all(tasks.map(async (task) => {
    const completions = await TaskCompletion.find({ taskId: task._id })
    return {
      ...task.toObject(),
      completions,
      completionCount: completions.length,
    }
  }))

  const leaderIdStr = String(group.leaderId)
  return {
    ...group.toObject(),
    leaderId: leaderIdStr,
    members: members.map((m) => {
      const mid = String(m.userId._id || m.userId)
      const isLeader = mid === leaderIdStr
      return {
        id: m.userId._id || m.userId,
        displayName: m.userId.displayName || 'User',
        role: isLeader ? 'leader' : m.role,
        isLeader,
        joinedAt: m.joinedAt,
      }
    }),
    memberCount: members.length,
    role: String(userId) === leaderIdStr ? 'leader' : (membership?.role || 'member'),
    invitedEmails: (group.invitedEmails || []).map((i) => i.email),
    pendingTaskCount: tasksWithStatus.filter((t) => t.completionCount < members.length).length,
    tasks: tasksWithStatus,
    notes,
  }
}

exports.getUsage = async (req, res) => {
  try {
    const used = await groupsCreatedThisMonth(req.user._id)
    res.json({
      used,
      limit: MAX_GROUPS_PER_MONTH,
      remaining: Math.max(0, MAX_GROUPS_PER_MONTH - used),
      maxMembers: MAX_MEMBERS,
      minNameLength: MIN_GROUP_NAME,
      maxNameLength: MAX_GROUP_NAME,
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getAll = async (req, res) => {
  try {
    const memberships = await GroupMember.find({ userId: req.user._id })
    const groups = await Promise.all(memberships.map(async (m) => {
      const group = await Group.findById(m.groupId)
      if (!group) return null
      const enriched = await enrichGroup(group, req.user._id)
      return { ...enriched, role: m.role }
    }))
    res.json(groups.filter(Boolean))
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.create = async (req, res) => {
  try {
    const leaderId = req.user?.id || req.user?._id
    const nameErr = validateGroupName(req.body.name)
    if (nameErr) return res.status(400).json({ message: nameErr })
    const used = await groupsCreatedThisMonth(leaderId)
    if (used >= MAX_GROUPS_PER_MONTH) {
      return res.status(400).json({ message: 'You can only create 3 groups per month' })
    }
    const inviteCode = crypto.randomBytes(4).toString('hex')
    const group = await Group.create({
      name: req.body.name.trim(),
      leaderId,
      inviteCode,
      invitedEmails: [],
    })
    await GroupMember.create({ groupId: group._id, userId: leaderId, role: 'leader' })
    res.status(201).json(group)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getOne = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    const member = await GroupMember.findOne({ groupId: group._id, userId: req.user._id })
    if (!member) return res.status(403).json({ message: 'Not a member' })
    const leader = await User.findById(group.leaderId).select('displayName')
    const data = await enrichGroup(group, req.user._id)
    const visibleNotes = data.notes.filter(
      (n) => !n.visibleTo || String(n.visibleTo) === String(req.user._id) || member.role === 'leader'
    )
    res.json({ ...data, leaderName: leader?.displayName, notes: visibleNotes })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getInvitePreview = async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.code })
    if (!group) return res.status(404).json({ message: 'Invalid invite code' })
    const leader = await User.findById(group.leaderId).select('displayName')
    const memberCount = await GroupMember.countDocuments({ groupId: group._id })
    res.json({
      id: group._id,
      name: group.name,
      groupName: group.name,
      leaderName: leader?.displayName,
      memberCount,
      inviteCode: group.inviteCode,
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.inviteByUsername = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!(await isGroupLeader(group, req.user._id))) {
      return res.status(403).json({ message: 'Leader only' })
    }
    const { username } = req.body
    const user = await User.findOne({ displayName: new RegExp(`^${username}$`, 'i') })
    if (!user) return res.status(404).json({ message: 'User not found' })
    const existing = await GroupMember.findOne({ groupId: group._id, userId: user._id })
    if (existing) return res.status(400).json({ message: 'User is already in this group', alreadyMember: true })
    const count = await GroupMember.countDocuments({ groupId: group._id })
    if (count >= MAX_MEMBERS) return res.status(400).json({ message: 'Group is full (15 max)' })
    await GroupMember.findOneAndUpdate(
      { groupId: group._id, userId: user._id },
      { role: 'member' },
      { upsert: true }
    )
    await notifyUser(user._id, {
      type: 'group',
      title: 'Added to a group',
      body: `You were added to ${group.name}`,
      url: `/groups/${group._id}`,
    })
    res.json({ message: `${user.displayName} added to the group` })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.inviteByEmail = async (req, res) => {
  try {
    const nodemailer = require('nodemailer')
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    const userId = req.user.id || req.user._id
    if (!(await isGroupLeader(group, userId))) {
      return res.status(403).json({ message: 'Leader only' })
    }

    const leader = await User.findById(userId)
    const email = normalizeEmail(req.body.email)
    if (!email) return res.status(400).json({ message: 'Email is required' })

    const alreadyInvited = (group.invitedEmails || []).some((i) => i.email === email)
    if (alreadyInvited) {
      return res.status(400).json({ message: 'Invite already sent to this email', alreadySent: true })
    }

    const existingUser = await User.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
    if (existingUser) {
      const member = await GroupMember.findOne({ groupId: group._id, userId: existingUser._id })
      if (member) {
        return res.status(400).json({ message: 'This user is already in the group', alreadyMember: true })
      }
    }

    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/invite/${group.inviteCode}`

    if (!process.env.SMTP_HOST) {
      group.invitedEmails = group.invitedEmails || []
      group.invitedEmails.push({ email, sentAt: new Date() })
      await group.save()
      return res.json({
        message: `Invite link generated. Email service not configured — share manually: ${inviteUrl}`,
        inviteUrl,
        alreadySent: false,
      })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    await transporter.sendMail({
      from: `"Habitly" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `${leader.displayName} invited you to join ${group.name} on Habitly`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#FAF8F5;">
          <h2 style="color:#1C1917;margin-bottom:8px;">You're invited! 🌱</h2>
          <p style="color:#5a4a3a;margin-bottom:4px;"><strong>${leader.displayName}</strong> has invited you to join the group <strong>${group.name}</strong> on Habitly.</p>
          <p style="color:#8C6E52;font-size:13px;margin-bottom:24px;">Habitly helps you track habits, build streaks, and stay accountable with your team.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#1C1917;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Accept Invite</a>
          <p style="color:#8C6E52;font-size:12px;margin-top:24px;">Or copy this link: ${inviteUrl}</p>
          <p style="color:#A08060;font-size:11px;margin-top:16px;">If you didn't expect this, you can ignore this email.</p>
        </div>
      `,
    })

    group.invitedEmails = group.invitedEmails || []
    group.invitedEmails.push({ email, sentAt: new Date() })
    await group.save()

    res.json({ message: `Invite sent to ${email}`, alreadySent: false })
  } catch (e) {
    console.error('Email invite error:', e)
    res.status(500).json({ message: 'Failed to send invite: ' + e.message })
  }
}

exports.joinByCode = async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.code })
    if (!group) return res.status(404).json({ message: 'Invalid invite code' })
    const existing = await GroupMember.findOne({ groupId: group._id, userId: req.user._id })
    if (existing) {
      return res.json({ group: await enrichGroup(group, req.user._id), alreadyMember: true })
    }
    const count = await GroupMember.countDocuments({ groupId: group._id })
    if (count >= MAX_MEMBERS) return res.status(400).json({ message: 'Group is full' })
    await GroupMember.create({ groupId: group._id, userId: req.user._id, role: 'member' })
    const leader = await User.findById(group.leaderId).select('displayName')
    if (leader && String(leader._id) !== String(req.user._id)) {
      await notifyUser(group.leaderId, {
        type: 'group',
        title: 'New group member',
        body: `${req.user.displayName} joined ${group.name}`,
        url: `/groups/${group._id}/leader`,
      })
    }
    res.json({ group: await enrichGroup(group, req.user._id), alreadyMember: false })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    const userId = req.user._id || req.user.id
    if (!(await isGroupLeader(group, userId))) {
      return res.status(403).json({ message: 'Only the group leader can delete this group' })
    }

    const members = await GroupMember.find({ groupId: group._id, userId: { $ne: userId } })
    const groupName = group.name
    await deleteGroupCascade(group._id)

    void Promise.allSettled(
      members.map((m) =>
        notifyUser(m.userId, {
          type: 'group',
          title: 'Group deleted',
          body: `"${groupName}" was deleted by the leader`,
          url: '/groups',
        })
      )
    )

    res.json({ message: 'Group deleted permanently' })
  } catch (e) {
    console.error('deleteGroup error:', e.message)
    res.status(500).json({ message: e.message || 'Failed to delete group' })
  }
}

exports.leave = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    const membership = await GroupMember.findOne({ groupId: group._id, userId: req.user._id })
    if (!membership) return res.status(400).json({ message: 'Not a member' })

    if (membership.role === 'leader') {
      const others = await GroupMember.find({ groupId: group._id, userId: { $ne: req.user._id } }).sort({ joinedAt: 1 })
      if (others.length === 0) {
        await deleteGroupCascade(group._id)
        return res.json({ message: 'Group deleted' })
      }
      const newLeader = others[0]
      newLeader.role = 'leader'
      await newLeader.save()
      group.leaderId = newLeader.userId
      await group.save()
    }
    await GroupMember.deleteOne({ groupId: group._id, userId: req.user._id })
    res.json({ message: 'Left group' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.createNote = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!(await isGroupLeader(group, req.user._id))) {
      return res.status(403).json({ message: 'Leader only' })
    }
    const content = (req.body.content || '').trim()
    if (!content) return res.status(400).json({ message: 'Note content is required' })

    const note = await GroupNote.create({
      groupId: group._id,
      leaderId: req.user._id,
      content,
      visibleTo: req.body.visibleTo || null,
    })

    const leaderName = req.user.displayName || 'Group leader'
    const members = await GroupMember.find({ groupId: group._id, userId: { $ne: req.user._id } })
    const preview = content.length > 80 ? `${content.slice(0, 80)}…` : content
    void Promise.allSettled(
      members.map((m) => {
        if (note.visibleTo && String(note.visibleTo) !== String(m.userId)) return Promise.resolve()
        return notifyUser(m.userId, {
          type: 'note',
          title: 'New group note',
          body: `${leaderName} posted in ${group.name}: "${preview}"`,
          url: `/groups/${group._id}`,
        })
      })
    )

    res.status(201).json(note)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.updateNote = async (req, res) => {
  try {
    const note = await GroupNote.findById(req.params.noteId)
    if (!note || String(note.leaderId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed' })
    }
    note.content = req.body.content ?? note.content
    if (req.body.visibleTo !== undefined) note.visibleTo = req.body.visibleTo
    await note.save()
    res.json(note)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.deleteNote = async (req, res) => {
  try {
    const note = await GroupNote.findById(req.params.noteId)
    if (!note || String(note.leaderId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed' })
    }
    await note.deleteOne()
    res.json({ message: 'Deleted' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}
