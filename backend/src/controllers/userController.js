const User = require('../models/userModel')

exports.search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json([])
    const users = await User.find({
      displayName: new RegExp(q, 'i'),
      _id: { $ne: req.user._id },
    })
      .select('displayName email')
      .limit(10)
    res.json(users.map((u) => ({ id: u._id, displayName: u.displayName, email: u.email })))
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}
