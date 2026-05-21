const mongoose = require('mongoose')
const subscriptionSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionJson: { type: Object, required: true },
}, { timestamps: true })
module.exports = mongoose.model('Subscription', subscriptionSchema)
