import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirm) return setError('Passwords do not match')
    if (newPassword.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, newPassword })
      setSuccess(true)
      toast.success('Password reset — you can sign in now')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Link may have expired.')
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
        <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1C1917', marginBottom: '8px' }}>Set new password</h2>
        <p style={{ fontSize: '13px', color: '#8C6E52', marginBottom: '24px' }}>Choose a strong password for your account.</p>

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
            ✅ Password reset successfully! Redirecting to login...
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
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#1C1917', marginBottom: '6px' }}>
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
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
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#1C1917', marginBottom: '6px' }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
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
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}
        <p style={{ marginTop: '16px', fontSize: '13px', color: '#8C6E52', textAlign: 'center' }}>
          <Link to="/login" style={{ color: '#8C6E52' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

