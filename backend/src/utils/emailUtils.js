const { Resend } = require('resend')
const nodemailer = require('nodemailer')

/**
 * Centralized email sending function.
 * Attempts delivery via Resend API if RESEND_API_KEY is configured.
 * Otherwise, falls back to traditional Nodemailer SMTP if configured.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML content of the email
 * @returns {Promise<{success: boolean, provider: string, id?: string}>}
 */
async function sendEmail({ to, subject, html }) {
  // 1. Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      console.log('[email] Attempting delivery via Resend API...')
      const resend = new Resend(process.env.RESEND_API_KEY)
      
      // Resend free tier sends from onboarding@resend.dev. 
      // If a custom domain is verified, specify RESEND_FROM_EMAIL (e.g. hello@habitly.app)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
      
      const response = await resend.emails.send({
        from: `Habitly <${fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
      })

      if (response.error) {
        throw new Error(response.error.message || 'Resend API returned an error')
      }

      console.log('[email] Sent successfully via Resend API. ID:', response.data?.id)
      return { success: true, provider: 'resend', id: response.data?.id }
    } catch (err) {
      console.error('[email] Resend delivery failed:', err.message)
      throw err
    }
  }

  // 2. Fall back to Nodemailer SMTP if SMTP details exist
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      console.log('[email] Attempting delivery via Nodemailer SMTP...')
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      })

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

  throw new Error('No email providers (Resend or SMTP) are configured in the environment')
}

module.exports = { sendEmail }
