const express = require('express')
const cors = require('cors')
const { connectDB } = require('./config/db')
const { errorHandler } = require('./middleware/errorMiddleware')
const { requireDb } = require('./middleware/dbMiddleware')

const app = express()

// /ping and /health — no DB required
app.get('/ping', (req, res) => res.send('pong'))
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

connectDB()

// VAPID — initialize once at startup (required for web-push send)
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
    console.warn('[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing — push delivery disabled (subscribe route still works)')
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

// Notifications — required; fail loudly at startup if broken
const notificationRoutes = require('./routes/notificationRoutes')

let authRoutes, habitRoutes, trackingRoutes, leaderboardRoutes, groupRoutes, taskRoutes, userRoutes
try { authRoutes         = require('./routes/authRoutes')         } catch (e) { console.error('authRoutes failed to load:', e.message) }
try { habitRoutes        = require('./routes/habitRoutes')        } catch (e) { console.error('habitRoutes failed to load:', e.message) }
try { trackingRoutes     = require('./routes/trackingRoutes')     } catch (e) { console.error('trackingRoutes failed to load:', e.message) }
try { leaderboardRoutes  = require('./routes/leaderboardRoutes')  } catch (e) { console.error('leaderboardRoutes failed to load:', e.message) }
try { groupRoutes        = require('./routes/groupRoutes')        } catch (e) { console.error('groupRoutes failed to load:', e.message) }
try { taskRoutes         = require('./routes/taskRoutes')         } catch (e) { console.error('taskRoutes failed to load:', e.message) }
try { userRoutes         = require('./routes/userRoutes')         } catch (e) { console.error('userRoutes failed to load:', e.message) }

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// DB-dependent routes — fail fast if MongoDB is down
app.use('/api', requireDb)

app.use('/api/notifications', notificationRoutes)

if (authRoutes)         app.use('/api/auth',          authRoutes)
if (habitRoutes)        app.use('/api/habits',         habitRoutes)
if (trackingRoutes)     app.use('/api/tracking',       trackingRoutes)
if (leaderboardRoutes)  app.use('/api/stats',          leaderboardRoutes)
if (groupRoutes)        app.use('/api/groups',         groupRoutes)
if (taskRoutes)         app.use('/api/tasks',          taskRoutes)
if (userRoutes)         app.use('/api/users',          userRoutes)

app.use(errorHandler)

module.exports = app
