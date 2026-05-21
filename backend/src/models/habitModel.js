const mongoose = require('mongoose')

const habitSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:         { type: String, required: true },
  type:         { type: String, enum: ['time', 'count', 'yesno'], required: true },
  target:       { type: Number, default: 1 },
  scheduleType: { type: String, enum: ['daily', 'weekdays', 'weekends', 'custom'], default: 'daily' },
  scheduleDays: [{ type: String }],
  streakCountsOnScheduledDaysOnly: { type: Boolean, default: true },
  reminderTime: { type: String, default: '09:00' },
  icon:         { type: String, default: '🌱' },
  color:        { type: String, default: '#8C6E52' },
  isArchived:   { type: Boolean, default: false },
}, { timestamps: true })

habitSchema.index({ userId: 1, isArchived: 1 })

module.exports = mongoose.model('Habit', habitSchema)
