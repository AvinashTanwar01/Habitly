const mongoose = require('mongoose')

const groupMemberSchema = new mongoose.Schema({
  groupId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:     { type: String, enum: ['leader', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
})

groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true })
groupMemberSchema.index({ userId: 1 })

module.exports = mongoose.model('GroupMember', groupMemberSchema)
