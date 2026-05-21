const mongoose = require('mongoose')

const inAppNotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, default: 'info' },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: '/dashboard' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

inAppNotificationSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('InAppNotification', inAppNotificationSchema)
