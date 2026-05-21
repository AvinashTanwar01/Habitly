const webpush = require('web-push')
const PushSubscription = require('../models/subscriptionModel')

let vapidWarned = false
function isPushConfigured() {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const ok = !!(pub && priv && pub !== 'to_be_provided' && priv !== 'to_be_provided')
  if (!ok && !vapidWarned) {
    console.warn('[push] VAPID keys missing — push notifications disabled')
    vapidWarned = true
  }
  return ok
}

function initVapid() {
  if (!isPushConfigured()) return false
  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:habitly@example.com',
      process.env.VAPID_PUBLIC_KEY.trim(),
      process.env.VAPID_PRIVATE_KEY.trim()
    )
    return true
  } catch (e) {
    console.warn('[push] init failed:', e.message)
    return false
  }
}

async function userHasSubscription(userId) {
  const n = await PushSubscription.countDocuments({ userId })
  return n > 0
}

async function sendToUser(userId, { title, body, url = '/dashboard' }) {
  try {
    if (!isPushConfigured()) return
    if (!initVapid()) return
    const subs = await PushSubscription.find({ userId })
    if (subs.length === 0) return
    const payload = JSON.stringify({ title, body, url })
    await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(s.subscriptionJson, payload).catch(async (err) => {
          const code = err?.statusCode
          if (code === 404 || code === 410) {
            await PushSubscription.deleteOne({ _id: s._id })
          }
        })
      )
    )
  } catch (e) {
    console.warn('[push] send failed:', e.message)
  }
}

module.exports = { sendToUser, isPushConfigured, initVapid, userHasSubscription }
