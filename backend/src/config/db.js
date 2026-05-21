const mongoose = require('mongoose')

// Fail fast instead of buffering queries forever when disconnected
mongoose.set('bufferCommands', false)

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in .env')
    return
  }
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      family: 4, // prefer IPv4 — avoids some Atlas DNS hang issues on macOS
    })
    console.warn('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection failed:', err.message)
    if (process.env.NODE_ENV === 'production') process.exit(1)
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected')
  })

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err.message)
  })
}

function isDbReady() {
  return mongoose.connection.readyState === 1
}

module.exports = { connectDB, isDbReady }
