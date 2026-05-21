const jwt = require('jsonwebtoken')
const User = require('../models/userModel')

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]?.trim()
    if (!token) return res.status(401).json({ message: 'Not authenticated' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const userId = decoded.id || decoded._id || decoded.userId
    const user = await User.findById(userId).select('-password').maxTimeMS(5000)
    if (!user) return res.status(401).json({ message: 'User not found' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}
