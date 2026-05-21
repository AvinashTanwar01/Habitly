const InAppNotification = require('../models/inAppNotificationModel')
const Notification = require('../models/notificationModel')
const { sendToUser } = require('./pushUtils')

/** Persist in-app notification and optionally send browser push. */
async function notifyUser(userId, { type = 'info', title, body = '', url = '/dashboard' }) {
  if (!userId || !title) return
  try {
    await InAppNotification.create({
      userId,
      type,
      title,
      body,
      link: url,
      read: false,
    })
  } catch (e) {
    console.warn('[notify] in-app create failed:', e.message)
  }
  try {
    await Notification.create({
      userId,
      title,
      body,
      url: url || '/',
      isRead: false,
    })
  } catch (e) {
    console.warn('[notify] notification create failed:', e.message)
  }
  await sendToUser(userId, { title, body, url })
}

module.exports = { notifyUser }
