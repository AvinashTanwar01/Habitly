const mongoose = require('mongoose')

const taskCompletionSchema = new mongoose.Schema({
  taskId:         { type: mongoose.Schema.Types.ObjectId, ref: 'GroupTask', required: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt:    { type: Date, default: Date.now },
  completedEarly: { type: Boolean, default: false },
})

taskCompletionSchema.index({ taskId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model('TaskCompletion', taskCompletionSchema)
