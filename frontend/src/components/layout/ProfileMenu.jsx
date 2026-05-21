import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../ui/Avatar'

export default function ProfileMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const handleLogout = async () => {
    setOpen(false)
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="relative" ref={ref} style={{ position: 'relative' }}>
      <Avatar user={user} size={34} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            background: 'white',
            border: '0.5px solid rgba(100,80,60,0.15)',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            minWidth: 180,
            zIndex: 100,
            animation: 'fadeIn 150ms ease',
            padding: '8px 0',
          }}
        >
          <div style={{ padding: '8px 14px 10px', borderBottom: '0.5px solid rgba(100,80,60,0.1)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1917', margin: 0 }}>{user?.displayName}</p>
            <p style={{ fontSize: 11, color: '#9A8070', margin: '2px 0 0' }}>{user?.email}</p>
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '9px 14px',
              fontSize: 13,
              color: '#1C1917',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#FAF8F5' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '9px 14px',
              fontSize: 13,
              color: '#DC2626',
              background: 'none',
              border: 'none',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  )
}
