const { isDbReady } = require('../config/db')

/** Reject API calls immediately if MongoDB is not connected (prevents infinite hangs). */
function requireDb(req, res, next) {
  if (isDbReady()) return next()
  res.status(503).json({ message: 'Database not connected. Please try again shortly.' })
}

module.exports = { requireDb }
