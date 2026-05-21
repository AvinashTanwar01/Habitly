require('dotenv').config()
const app = require('./src/app')
const { startScheduler } = require('./src/utils/scheduler')

const PORT = process.env.PORT || 5000

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set')
  process.exit(1)
}

if (!process.env.MONGO_URI) {
  console.error('FATAL: MONGO_URI is not set')
  process.exit(1)
}

try {
  startScheduler()
} catch (err) {
  console.error('Scheduler failed to start:', err.message)
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.warn(`Habitly API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`)

  // Render free tier self-ping to prevent sleep (every 14 minutes)
  if (process.env.RENDER_EXTERNAL_URL) {
    const url = `${process.env.RENDER_EXTERNAL_URL}/health`
    console.warn(`[ping] Registering self-ping to ${url} every 14 minutes`)
    const https = require('https')
    const http = require('http')
    const client = url.startsWith('https') ? https : http

    setInterval(() => {
      console.log(`[ping] Sending self-ping to ${url}`)
      client.get(url, (res) => {
        console.log(`[ping] Self-ping status code: ${res.statusCode}`)
      }).on('error', (err) => {
        console.error('[ping] Self-ping failed:', err.message)
      })
    }, 14 * 60 * 1000)
  }
})

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message)
  server.close(() => process.exit(1))
})

process.on('SIGTERM', () => {
  console.warn('SIGTERM received. Shutting down gracefully.')
  server.close(() => process.exit(0))
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`)
    process.exit(1)
  }
  console.error('Server error:', err.message)
  process.exit(1)
})
