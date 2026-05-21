const nodemailer = require('nodemailer')

function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getTransporter() {
  if (!isEmailConfigured()) return null
  try {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } catch (e) {
    console.warn('[email] transporter error:', e.message)
    return null
  }
}

async function sendInviteEmail({ to, groupName, leaderName, inviteUrl }) {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('[email] SMTP not configured — invite link not emailed:', inviteUrl)
    return { skipped: true, inviteUrl }
  }
  const subject = `You've been invited to join ${groupName} on Habitly`
  const html = `
<!DOCTYPE html>
<html><body style="font-family: system-ui,sans-serif;color:#1C1917;line-height:1.6;">
<p style="font-size:18px;font-weight:600;color:#8C6E52;">Habitly</p>
<p>Hi there! <strong>${leaderName}</strong> has invited you to join the group <strong>${groupName}</strong>.</p>
<p style="margin:24px 0;">
<a href="${inviteUrl}" style="display:inline-block;background:#1C1917;color:#FAF8F5;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Accept Invite</a>
</p>
<p style="font-size:13px;color:#9A8070;">Or copy: ${inviteUrl}</p>
<p style="font-size:12px;color:#9A8070;margin-top:32px;">If you didn't expect this email, you can ignore it.</p>
</body></html>`

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    })
    return { sent: true }
  } catch (e) {
    console.error('[email] send failed:', e.message)
    throw e
  }
}

module.exports = { sendInviteEmail, isEmailConfigured }
