import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

export default function NotificationDropdown({ onClose }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications/recent')
        const data = res.data
        const list = Array.isArray(data)
          ? data
          : data.notifications || []
        if (!cancelled) setNotifications(list)
        await api.post('/notifications/mark-read')
        window.dispatchEvent(new Event('habitly:refresh-notifications'))
      } catch {
        if (!cancelled) setNotifications([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchNotifications()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        right: 0,
        background: 'white',
        border: '0.5px solid rgba(100,80,60,0.15)',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        width: 300,
        zIndex: 100,
        animation: 'fadeIn 150ms ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          borderBottom: '0.5px solid rgba(100,80,60,0.1)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }}>Notifications</span>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A8070', fontSize: 16 }}
        >
          ×
        </button>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 20, fontSize: 13, color: '#9A8070' }}>Loading...</p>
        ) : notifications.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 24, fontSize: 13, color: '#9A8070' }}>No notifications yet</p>
        ) : (
          notifications.map((n) => (
            <Link
              key={n._id}
              to={n.url || '/dashboard'}
              onClick={onClose}
              style={{
                display: 'block',
                padding: '10px 14px',
                borderBottom: '0.5px solid rgba(100,80,60,0.06)',
                background: n.isRead ? 'transparent' : '#FAF8F5',
                textDecoration: 'none',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 500, color: '#1C1917', margin: '0 0 2px' }}>{n.title}</p>
              {n.body ? (
                <p style={{ fontSize: 12, color: '#9A8070', margin: 0 }}>{n.body}</p>
              ) : null}
              <p style={{ fontSize: 11, color: '#C4A882', margin: '3px 0 0' }}>
                {new Date(n.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
