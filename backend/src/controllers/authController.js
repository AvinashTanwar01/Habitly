const User = require('../models/userModel')
const Habit = require('../models/habitModel')
const Completion = require('../models/completionModel')
const PushSubscription = require('../models/subscriptionModel')
const GroupMember = require('../models/groupMemberModel')
const Group = require('../models/groupModel')
const GroupTask = require('../models/groupTaskModel')
const GroupNote = require('../models/groupNoteModel')
const TaskCompletion = require('../models/taskCompletionModel')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { sendEmail } = require('../utils/emailUtils')
const { verifyGoogleIdToken } = require('../utils/googleAuthUtils')
const { clearLeaderboardCache } = require('./leaderboardController')

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })

function userPayload(user) {
  return {
    id: user._id,
    displayName: user.displayName,
    email: user.email,
    resetTime: user.resetTime,
    profileImage: user.profileImage || '',
    googleId: user.googleId || null,
    hasPassword: !!user.password,
  }
}

// exports.signup = async (req, res) => {
//   try {
//     const { displayName, email, password } = req.body
//     if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already in use' })
//     const user = await User.create({
//       displayName,
//       email,
//       password: await bcrypt.hash(password, 12),
//     })
//     res.status(201).json({
//       token: signToken(user._id),
//       user: userPayload(user),
//     })
//   } catch (err) {
//     console.error('Signup error:', err)
//     res.status(500).json({ message: err.message })
//   }
// }
exports.signup = async (req, res) => {
  try {
    const { displayName, email, password } = req.body

    // Validation
    if (!displayName || displayName.trim().length < 2) {
      return res.status(400).json({ message: 'Display name must be at least 2 characters' })
    }
    if (displayName.trim().length > 50) {
      return res.status(400).json({ message: 'Display name must be under 50 characters' })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' })
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }
    if (password.length > 128) {
      return res.status(400).json({ message: 'Password is too long' })
    }

    if (await User.findOne({ email: email.toLowerCase().trim() })) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    const user = await User.create({
      displayName: displayName.trim(),
      email: email.toLowerCase().trim(),
      password: await bcrypt.hash(password, 12),
    })
    res.status(201).json({
      token: signToken(user._id),
      user: userPayload(user),
    })
  } catch (err) {
    console.error('Signup error:', err)
    res.status(500).json({ message: err.message })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user?.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    res.json({
      token: signToken(user._id),
      user: userPayload(user),
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: err.message })
  }
}

exports.googleLogin = async (req, res) => {
  try {
    const { googleToken } = req.body
    const { googleId, email, name } = await verifyGoogleIdToken(googleToken)

    let user = await User.findOne({ googleId })
    if (!user) {
      user = await User.findOne({ email })
      if (user) {
        if (user.googleId && user.googleId !== googleId) {
          return res.status(400).json({ message: 'This email is linked to a different Google account' })
        }
        user.googleId = googleId
        await user.save()
      } else {
        user = await User.create({ displayName: name, email, googleId })
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    })
    res.json({ token, user: userPayload(user) })
  } catch (err) {
    console.error('Google auth error:', err.message)
    const status = err.status || 401
    res.status(status).json({
      message: status === 401 ? `Google authentication failed: ${err.message}` : err.message,
    })
  }
}

/** Link Google to the currently logged-in account (Settings). Email must match. */
exports.linkGoogle = async (req, res) => {
  try {
    const { googleToken } = req.body
    const { googleId, email, name } = await verifyGoogleIdToken(googleToken)

    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (user.email.toLowerCase() !== email) {
      return res.status(400).json({
        message: `Use the Google account for ${user.email}. You signed in with a different email (${email}).`,
      })
    }

    const taken = await User.findOne({ googleId, _id: { $ne: user._id } })
    if (taken) {
      return res.status(400).json({ message: 'This Google account is already linked to another Habitly user' })
    }

    user.googleId = googleId
    if (!user.displayName?.trim() && name) user.displayName = name
    await user.save()

    clearLeaderboardCache()

    res.json({ user: userPayload(user) })
  } catch (err) {
    console.error('Link Google error:', err.message)
    const status = err.status || 500
    res.status(status).json({ message: err.message || 'Could not connect Google' })
  }
}

exports.getMe = async (req, res) => {
  try {
    const full = await User.findById(req.user._id)
      .select('password googleId displayName email resetTime profileImage')
      .maxTimeMS(5000)
    if (!full) return res.status(404).json({ message: 'User not found' })
    res.json({
      user: {
        id: full._id,
        displayName: full.displayName,
        email: full.email,
        resetTime: full.resetTime,
        profileImage: full.profileImage || '',
        googleId: full.googleId || null,
        hasPassword: !!full.password,
      },
    })
  } catch (err) {
    console.error('getMe error:', err.message)
    res.status(500).json({ message: err.message })
  }
}

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    const imageUrl = req.file.path
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: imageUrl },
      { new: true },
    ).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })

    clearLeaderboardCache()

    res.json({ user: userPayload(user), profileImage: imageUrl })
  } catch (err) {
    console.error('Avatar upload error:', err)
    res.status(500).json({ message: 'Failed to upload avatar: ' + err.message })
  }
}

exports.updateProfile = exports.updateMe = async (req, res) => {
  try {
    const { displayName, resetTime, profileImage } = req.body
    const updates = {}
    if (displayName !== undefined) updates.displayName = displayName
    if (resetTime !== undefined) updates.resetTime = resetTime
    if (profileImage !== undefined) updates.profileImage = profileImage
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'Nothing to update' })
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })

    clearLeaderboardCache()

    res.json({ user: userPayload(user) })
  } catch (err) {
    console.error('updateProfile error:', err.message)
    res.status(500).json({ message: err.message })
  }
}

exports.updatePassword = exports.changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const { oldPassword, newPassword, confirmPassword } = req.body
    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' })
    }
    if (!user.password) return res.status(400).json({ message: 'Set a password first or use Google login' })
    if (!(await bcrypt.compare(oldPassword, user.password))) {
      return res.status(401).json({ message: 'Current password is incorrect' })
    }
    user.password = await bcrypt.hash(newPassword, 12)
    await user.save()
    res.json({ message: 'Password updated' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.disconnectGoogle = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user.password) {
      return res.status(400).json({ message: 'Set a password before disconnecting Google' })
    }
    await User.findByIdAndUpdate(user._id, { $unset: { googleId: 1 } })
    const updated = await User.findById(user._id)
    res.json({ user: userPayload(updated) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' })
    }
    const resetToken = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = Date.now() + 3600000
    await user.save()

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`
    try {
      await sendEmail({
        to: email,
        subject: 'Reset your Habitly password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
            <h2 style="color:#1C1917;">Reset your password</h2>
            <p style="color:#5a4a3a;">Click the button below to reset your Habitly password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#1C1917;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Reset Password</a>
            <p style="color:#8C6E52;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      })
    } catch (mailErr) {
      console.warn('Password reset email failed to send:', mailErr.message)
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ message: 'Failed to send reset email. Please try again.' })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' })
    }
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    })
    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' })
    }
    user.password = await bcrypt.hash(newPassword, 12)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()
    res.json({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset password.' })
  }
}

async function deleteGroupCascade(groupId) {
  const tasks = await GroupTask.find({ groupId })
  const taskIds = tasks.map((t) => t._id)
  await TaskCompletion.deleteMany({ taskId: { $in: taskIds } })
  await GroupTask.deleteMany({ groupId })
  await GroupNote.deleteMany({ groupId })
  await GroupMember.deleteMany({ groupId })
  await Group.findByIdAndDelete(groupId)
}

exports.deleteMe = async (req, res) => {
  try {
    const userId = req.user._id
    const habitDocs = await Habit.find({ userId })
    const habitIds = habitDocs.map((h) => h._id)
    await Completion.deleteMany({ $or: [{ userId }, { habitId: { $in: habitIds } }] })
    await Habit.deleteMany({ userId })

    await TaskCompletion.deleteMany({ userId })
    await PushSubscription.deleteMany({ userId })

    const memberships = await GroupMember.find({ userId })
    for (const m of memberships) {
      const group = await Group.findById(m.groupId)
      if (!group) {
        await GroupMember.deleteOne({ _id: m._id })
        continue
      }
      const isLeader = String(group.leaderId) === String(userId)
      if (isLeader) {
        const others = await GroupMember.find({ groupId: group._id, userId: { $ne: userId } }).sort({ joinedAt: 1 })
        if (others.length === 0) {
          await deleteGroupCascade(group._id)
        } else {
          const newLeader = others[0]
          newLeader.role = 'leader'
          await newLeader.save()
          group.leaderId = newLeader.userId
          await group.save()
          await GroupMember.deleteOne({ groupId: group._id, userId })
        }
      } else {
        await GroupMember.deleteOne({ groupId: group._id, userId })
      }
    }

    await User.findByIdAndDelete(userId)
    res.json({ message: 'Account deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.deleteAccount = exports.deleteMe
