const router = require('express').Router()
const auth = require('../controllers/authController')
const protect = require('../middleware/authMiddleware')
const { upload } = require('../config/cloudinary')

router.post('/signup', auth.signup)
router.post('/login', auth.login)
router.post('/google', auth.googleLogin)
router.post('/google/link', protect, auth.linkGoogle)
router.post('/forgot-password', auth.forgotPassword)
router.post('/reset-password', auth.resetPassword)
router.get('/me', protect, auth.getMe)
router.put('/profile', protect, auth.updateProfile)
router.post('/upload-avatar', protect, upload.single('avatar'), auth.uploadAvatar)
router.put('/password', protect, auth.updatePassword)
router.delete('/google', protect, auth.disconnectGoogle)
router.delete('/me', protect, auth.deleteAccount)

module.exports = router
