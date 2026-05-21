const Group = require('../models/groupModel')
const GroupMember = require('../models/groupMemberModel')
const GroupTask = require('../models/groupTaskModel')
const GroupNote = require('../models/groupNoteModel')
const TaskCompletion = require('../models/taskCompletionModel')
const User = require('../models/userModel')
const { notifyUser } = require('../utils/notifyUser')
const { sendEmail } = require('../utils/emailUtils')
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
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    const userId = req.user.id || req.user._id
    if (!(await isGroupLeader(group, userId))) {
      return res.status(403).json({ message: 'Leader only' })
    }

    const leader = req.user
    const email = normalizeEmail(req.body.email)
    if (!email) return res.status(400).json({ message: 'Email is required' })

    const inviteCount = (group.invitedEmails || []).filter((i) => i.email === email).length
    if (inviteCount >= 5) {
      return res.status(400).json({ message: 'Invite limit (5) reached for this email', alreadySent: true })
    }

    const existingUser = await User.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
    if (existingUser) {
      const member = await GroupMember.findOne({ groupId: group._id, userId: existingUser._id })
      if (member) {
        return res.status(400).json({ message: 'This user is already in the group', alreadyMember: true })
      }
    }

    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/invite/${group.inviteCode}`

    let emailSent = false
    let emailError = null

    try {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're invited to Habitly</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF8F5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border: 1px solid rgba(100, 80, 60, 0.12); border-radius: 16px; overflow: hidden; padding: 32px;">
          <tr>
            <td style="color: #1C1917; font-size: 22px; font-weight: 700; text-align: center; padding-bottom: 24px;">
              Habitly Invitation
            </td>
          </tr>
          <tr>
            <td style="color: #5A4A3A; font-size: 15px; line-height: 1.6; text-align: center; padding-bottom: 24px;">
              <strong>${leader.displayName || 'A friend'}</strong> has invited you to join their group <strong>${group.name}</strong> on Habitly, the mindful habit tracking application.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${inviteUrl}" style="display: inline-block; background-color: #1C1917; color: #FAF8F5; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(28, 25, 23, 0.15);">
                Accept Invitation
              </a>
            </td>
          </tr>
          <tr>
            <td style="color: #9A8070; font-size: 12px; text-align: center; line-height: 1.5;">
              Button not working? Copy and paste this URL into your browser:<br>
              <a href="${inviteUrl}" style="color: #8C6E52; text-decoration: underline; word-break: break-all;">${inviteUrl}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `

      await sendEmail({
        to: email,
        subject: `${leader.displayName || 'A friend'} invited you to join ${group.name} on Habitly`,
        html: emailHtml,
      })
      emailSent = true
    } catch (mailErr) {
      console.warn('Email delivery failed, falling back to manual share link:', mailErr.message)
      emailError = mailErr.message
    }

    // Always save the invitation to the DB so the group tracks that it was generated/attempted
    group.invitedEmails = group.invitedEmails || []
    group.invitedEmails.push({ email, sentAt: new Date() })
    await group.save()

    if (emailSent) {
      return res.json({ message: `Invite sent to ${email}`, alreadySent: false })
    }

    if (emailError) {
      return res.json({
        message: `Invite generated! Email delivery failed (${emailError}) — please share this link manually: ${inviteUrl}`,
        inviteUrl,
        alreadySent: false,
      })
    }

    return res.json({
      message: `Invite link generated. Email service not configured — share manually: ${inviteUrl}`,
      inviteUrl,
      alreadySent: false,
    })
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
