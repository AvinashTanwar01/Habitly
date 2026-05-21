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
      className="fixed left-3 right-3 top-[calc(52px+env(safe-area-inset-top,0px)+0.5rem)] md:absolute md:left-auto md:right-0 md:top-10 md:w-[min(300px,calc(100vw-2rem))] z-[100] bg-white border border-[rgba(100,80,60,0.15)] rounded-xl shadow-lg animate-[fadeIn_150ms_ease] max-h-[min(70vh,420px)] flex flex-col"
    >
      <div className="flex justify-between items-center px-3.5 py-3 border-b border-[rgba(100,80,60,0.1)] shrink-0">
        <span className="text-[13px] font-semibold text-[#1C1917]">Notifications</span>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[#9A8070] hover:bg-[#F2EDE6]"
          aria-label="Close notifications"
        >
          ×
        </button>
      </div>
      <div className="overflow-y-auto flex-1 min-h-0">
        {loading ? (
          <p className="text-center py-5 text-[13px] text-[#9A8070]">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="text-center py-6 text-[13px] text-[#9A8070]">No notifications yet</p>
        ) : (
          notifications.map((n) => (
            <Link
              key={n._id}
              to={n.url || '/dashboard'}
              onClick={onClose}
              className={`block px-3.5 py-2.5 border-b border-[rgba(100,80,60,0.06)] last:border-0 ${
                n.isRead ? 'bg-transparent' : 'bg-[#FAF8F5]'
              }`}
            >
              <p className="text-[13px] font-medium text-[#1C1917] mb-0.5">{n.title}</p>
              {n.body ? (
                <p className="text-xs text-[#9A8070]">{n.body}</p>
              ) : null}
              <p className="text-[11px] text-[#C4A882] mt-1">
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
