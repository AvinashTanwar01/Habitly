const router = require('express').Router()
const notifications = require('../controllers/notificationController')
const protect = require('../middleware/authMiddleware')

router.get('/vapid-public-key', notifications.getPublicKey)
router.post('/subscribe', protect, notifications.subscribe)
router.delete('/unsubscribe', protect, notifications.unsubscribe)

module.exports = router
