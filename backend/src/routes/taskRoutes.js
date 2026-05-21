const router = require('express').Router()
const task = require('../controllers/taskController')
const protect = require('../middleware/authMiddleware')

router.use(protect)
router.get('/group/:groupId', task.getByGroup)
router.post('/group/:groupId', task.create)
router.put('/:id', task.update)
router.delete('/:id', task.delete)
router.post('/:id/complete', task.complete)

module.exports = router
