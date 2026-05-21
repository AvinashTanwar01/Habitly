const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String },
  googleId:    { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  resetTime:   { type: String, default: '00:00' },
  profileImage: { type: String, default: '' },
}, { timestamps: true })
module.exports = mongoose.model('User', userSchema)
