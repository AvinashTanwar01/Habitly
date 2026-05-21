const mongoose = require('mongoose')

const groupTaskSchema = new mongoose.Schema({
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  deadline:    { type: Date, required: true },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

groupTaskSchema.index({ groupId: 1 })

module.exports = mongoose.model('GroupTask', groupTaskSchema)
