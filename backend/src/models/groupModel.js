const mongoose = require('mongoose')
const { nanoid } = require('nanoid')

const groupSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  leaderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteCode: { type: String, unique: true, default: () => nanoid(8) },
  invitedEmails: [{
    email: { type: String, lowercase: true, trim: true },
    sentAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true })

groupSchema.index({ leaderId: 1 })

module.exports = mongoose.model('Group', groupSchema)
