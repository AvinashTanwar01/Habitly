const router = require('express').Router()
const user = require('../controllers/userController')
const protect = require('../middleware/authMiddleware')

router.use(protect)
router.get('/search', user.search)

module.exports = router
