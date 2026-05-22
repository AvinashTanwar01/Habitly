const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const { connectDB } = require('./config/db')
const { errorHandler } = require('./middleware/errorMiddleware')
const { requireDb } = require('./middleware/dbMiddleware')

const app = express()

app.get('/ping', (req, res) => res.send('pong'))
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

connectDB()

try {
  const webpush = require('web-push')
  const pub = (process.env.VAPID_PUBLIC_KEY || '').trim()
  const priv = (process.env.VAPID_PRIVATE_KEY || '').trim()
  if (pub && priv && pub !== 'to_be_provided' && priv !== 'to_be_provided') {
    webpush.setVapidDetails(
      (process.env.VAPID_EMAIL || 'mailto:habitly@example.com').trim(),
      pub,
      priv
    )
    console.warn('[push] VAPID configured for browser notifications')
  } else {
    console.warn('[push] VAPID keys missing — push delivery disabled')
  }
} catch (e) {
  console.error('[push] web-push init failed:', e.message)
}

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else if (process.env.NODE_ENV !== 'production') {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

// Rate limiting — auth only, skipped in development
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
})

const notificationRoutes = require('./routes/notificationRoutes')

let authRoutes, habitRoutes, trackingRoutes, leaderboardRoutes, groupRoutes, taskRoutes, userRoutes
try { authRoutes        = require('./routes/authRoutes')        } catch (e) { console.error('authRoutes failed:', e.message) }
try { habitRoutes       = require('./routes/habitRoutes')       } catch (e) { console.error('habitRoutes failed:', e.message) }
try { trackingRoutes    = require('./routes/trackingRoutes')    } catch (e) { console.error('trackingRoutes failed:', e.message) }
try { leaderboardRoutes = require('./routes/leaderboardRoutes') } catch (e) { console.error('leaderboardRoutes failed:', e.message) }
try { groupRoutes       = require('./routes/groupRoutes')       } catch (e) { console.error('groupRoutes failed:', e.message) }
try { taskRoutes        = require('./routes/taskRoutes')        } catch (e) { console.error('taskRoutes failed:', e.message) }
try { userRoutes        = require('./routes/userRoutes')        } catch (e) { console.error('userRoutes failed:', e.message) }

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))
app.use('/api', requireDb)
app.use('/api/notifications', notificationRoutes)

// Apply rate limiter to auth routes in production
if (authRoutes) app.use('/api/auth', authLimiter, authRoutes)
if (habitRoutes)        app.use('/api/habits',   habitRoutes)
if (trackingRoutes)     app.use('/api/tracking', trackingRoutes)
if (leaderboardRoutes)  app.use('/api/stats',    leaderboardRoutes)
if (groupRoutes)        app.use('/api/groups',   groupRoutes)
if (taskRoutes)         app.use('/api/tasks',    taskRoutes)
if (userRoutes)         app.use('/api/users',    userRoutes)

app.use(errorHandler)

module.exports = app