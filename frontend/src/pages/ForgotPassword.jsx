import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSuccess(true)
      toast.success('If that email exists, we sent a reset link')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAF8F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '0.5px solid rgba(100,80,60,0.15)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '420px',
          width: '100%',
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          <Link to="/login" style={{ color: '#8C6E52', fontSize: '13px', textDecoration: 'none' }}>
            ← Back to sign in
          </Link>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1C1917', marginBottom: '8px' }}>Forgot password?</h2>
        <p style={{ fontSize: '13px', color: '#8C6E52', marginBottom: '24px' }}>
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {success ? (
          <div
            style={{
              background: '#F2EDE6',
              border: '0.5px solid rgba(100,80,60,0.2)',
              borderRadius: '10px',
              padding: '16px',
              fontSize: '13px',
              color: '#5a4a3a',
            }}
          >
            ✅ Check your email for a password reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#DC2626',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#1C1917', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid rgba(100,80,60,0.2)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#FAF8F5',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px',
                background: '#1C1917',
                color: '#FAF8F5',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

