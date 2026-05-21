const PushSubscription = require('../models/subscriptionModel')
const { isPushConfigured } = require('../utils/pushUtils')

exports.subscribe = async (req, res) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({ message: 'Push notifications are not configured' })
    }
    const { subscription } = req.body
    if (!subscription) return res.status(400).json({ message: 'Subscription required' })
    await PushSubscription.findOneAndUpdate(
      { userId: req.user._id, 'subscriptionJson.endpoint': subscription.endpoint },
      { userId: req.user._id, subscriptionJson: subscription },
      { upsert: true, new: true }
    )
    res.json({ message: 'Subscribed' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getVapidPublicKey = async (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(503).json({ message: 'Push not configured' })
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY })
}
