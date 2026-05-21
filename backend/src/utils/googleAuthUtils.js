const { OAuth2Client } = require('google-auth-library')

async function verifyGoogleIdToken(googleToken) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    const err = new Error('Google auth not configured on server')
    err.status = 503
    throw err
  }
  if (!googleToken) {
    const err = new Error('Google token is required')
    err.status = 400
    throw err
  }

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID.trim())
  const ticket = await client.verifyIdToken({
    idToken: googleToken,
    audience: process.env.GOOGLE_CLIENT_ID.trim(),
  })
  const payload = ticket.getPayload()
  if (!payload?.email) {
    const err = new Error('Google account has no email')
    err.status = 400
    throw err
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name || payload.email.split('@')[0],
  }
}

module.exports = { verifyGoogleIdToken }
