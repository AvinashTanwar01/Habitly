const mongoose = require('mongoose')
const completionSchema = new mongoose.Schema({
  habitId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  date:         { type: String, required: true },
  isDone:       { type: Boolean, default: false },
  actualAmount: { type: Number },
}, { timestamps: true })
completionSchema.index({ habitId: 1, date: 1 }, { unique: true })
completionSchema.index({ userId: 1, date: 1 })
completionSchema.index({ userId: 1, habitId: 1 })
module.exports = mongoose.model('Completion', completionSchema)
