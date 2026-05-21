const router = require('express').Router()
const lb = require('../controllers/leaderboardController')
const protect = require('../middleware/authMiddleware')

router.get('/leaderboard', lb.getLeaderboard)
router.get('/landing', lb.getLandingStats)
router.get('/summary', protect, lb.getSummary)
router.get('/weekly', protect, lb.getWeekly)
router.get('/streak/:habitId', protect, lb.getStreak)

module.exports = router
