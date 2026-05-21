const router = require('express').Router()
const notifications = require('../controllers/notificationController')
const protect = require('../middleware/authMiddleware')

// Public — no auth required
router.get('/public-key', notifications.getPublicKey)

// Helpful if someone tests with GET (curl/browser) instead of POST
router.get('/subscribe', (req, res) => {
  res.status(405).json({
    message: 'Use POST /api/notifications/subscribe with Authorization header and { "subscription": { ... } } body',
  })
})

// Push subscription (browser notifications)
router.post('/subscribe', protect, notifications.subscribe)
router.delete('/unsubscribe', protect, notifications.unsubscribe)

// In-app notification bell
router.get('/in-app', protect, notifications.getInApp)
router.get('/recent', protect, notifications.getRecent)
router.post('/mark-read', protect, notifications.markRead)
router.patch('/in-app/read-all', protect, notifications.markAllInAppRead)
router.patch('/in-app/:id/read', protect, notifications.markInAppRead)

module.exports = router
