const nodemailer = require('nodemailer')

/**
 * Centralized email sending function.
 * Sends emails via Nodemailer SMTP.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML content of the email
 * @returns {Promise<{success: boolean, provider: string, messageId: string}>}
 */
async function sendEmail({ to, subject, html }) {
  // Traditional Nodemailer SMTP delivery
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      console.log('[email] Attempting delivery via Nodemailer SMTP...')
      const port = Number(process.env.SMTP_PORT) || 465
      const secure = port === 465

      const transportConfig = {
        host: process.env.SMTP_HOST,
        port: port,
        secure: secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 45000,
      }

      if (port === 587) {
        transportConfig.secure = false
        transportConfig.tls = { rejectUnauthorized: false }
      }

      const transporter = nodemailer.createTransport(transportConfig)

      const info = await transporter.sendMail({
        from: `"Habitly" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: html,
      })

      console.log('[email] Sent successfully via Nodemailer SMTP. MessageId:', info.messageId)
      return { success: true, provider: 'smtp', messageId: info.messageId }
    } catch (err) {
      console.error('[email] Nodemailer SMTP delivery failed:', err.message)
      throw err
    }
  }

  throw new Error('SMTP email provider is not configured in the environment')
}

module.exports = { sendEmail }
