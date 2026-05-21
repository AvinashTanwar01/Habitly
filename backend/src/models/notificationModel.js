const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  url: { type: String, default: '/' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

notificationSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
