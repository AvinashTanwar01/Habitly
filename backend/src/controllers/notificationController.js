const PushSubscription = require('../models/subscriptionModel')
const InAppNotification = require('../models/inAppNotificationModel')
const Notification = require('../models/notificationModel')
const { isPushConfigured } = require('../utils/pushUtils')

exports.subscribe = async (req, res) => {
  try {
    const { subscription } = req.body
    if (!subscription?.endpoint) {
      return res.status(400).json({ message: 'Valid push subscription required (must include endpoint)' })
    }
    await PushSubscription.findOneAndUpdate(
      { userId: req.user._id },
      { userId: req.user._id, subscriptionJson: subscription },
      { upsert: true, new: true }
    )
    const payload = { message: 'Subscribed successfully' }
    if (!isPushConfigured()) {
      payload.warning = 'Subscription saved, but VAPID keys are missing on the server — push delivery is disabled until configured.'
    }
    res.json(payload)
  } catch (e) {
    console.error('subscribe error:', e.message)
    res.status(500).json({ message: e.message })
  }
}

exports.unsubscribe = async (req, res) => {
  try {
    await PushSubscription.findOneAndDelete({ userId: req.user._id })
    res.json({ message: 'Unsubscribed successfully' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getPublicKey = async (req, res) => {
  const key = (process.env.VAPID_PUBLIC_KEY || '').trim()
  if (!key || key === 'to_be_provided') {
    return res.status(503).json({ message: 'Push not configured' })
  }
  res.set('Cache-Control', 'no-store')
  res.json({ publicKey: key })
}

exports.getInApp = async (req, res) => {
  try {
    const items = await InAppNotification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .maxTimeMS(5000)
    const unreadCount = items.filter((n) => !n.read).length
    res.json({ items, unreadCount })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.markInAppRead = async (req, res) => {
  try {
    await InAppNotification.updateOne(
      { _id: req.params.id, userId: req.user._id },
      { read: true }
    )
    res.json({ message: 'Marked read' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.markAllInAppRead = async (req, res) => {
  try {
    await InAppNotification.updateMany({ userId: req.user._id, read: false }, { read: true })
    res.json({ message: 'All marked read' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

/** Last 10 notifications for bell dropdown. */
exports.getRecent = exports.getRecentNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .maxTimeMS(5000)
    const unreadCount = notifications.filter((n) => !n.isRead).length
    res.json({ notifications, unreadCount })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.markRead = exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true })
    await InAppNotification.updateMany({ userId: req.user._id, read: false }, { read: true })
    res.json({ message: 'Marked all as read' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}
