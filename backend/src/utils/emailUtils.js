const sendEmail = async ({ to, subject, html }) => {
  console.log('📧 sendEmail called for:', to)
  
  if (!process.env.BREVO_API_KEY) {
    console.warn('⚠️ BREVO_API_KEY not set — skipping email')
    return
  }

  console.log('🔑 API Key starts with:', process.env.BREVO_API_KEY.substring(0, 15))

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Habitly', email: 'tanwaravinash352@gmail.com' },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
      }),
    })

    const responseBody = await response.json()
    console.log('📨 Brevo response status:', response.status)
    console.log('📨 Brevo response body:', JSON.stringify(responseBody))

    if (!response.ok) {
      console.error('❌ Brevo email error:', responseBody)
    } else {
      console.log('✅ Email sent successfully!')
    }
  } catch (err) {
    console.error('❌ Email send failed:', err.message)
  }
}

module.exports = { sendEmail }