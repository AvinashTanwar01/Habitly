import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFound() {
  const { user } = useAuth()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF8F5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '16px',
          lineHeight: 1,
        }}>
          🌌
        </div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1C1917',
          letterSpacing: '-0.5px',
          margin: '0 0 8px',
        }}>
          Lost in the sky
        </h1>
        <p style={{
          fontSize: '15px',
          color: '#9A8070',
          lineHeight: '1.6',
          margin: '0 0 32px',
        }}>
          This page doesn't exist or has been moved.
        </p>
        <Link
          to={user ? '/dashboard' : '/'}
          style={{
            display: 'inline-block',
            background: '#1C1917',
            color: '#FAF8F5',
            padding: '12px 28px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {user ? '← Back to Dashboard' : '← Back to Home'}
        </Link>
      </div>
    </div>
  )
}