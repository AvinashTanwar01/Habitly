import { useCallback, useEffect, useRef, useState } from 'react'
import { getStoredToken } from '../../services/api'
import { inAppNotificationService } from '../../services/inAppNotificationService'
import NotificationDropdown from '../ui/NotificationDropdown'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const panelRef = useRef(null)

  const loadUnread = useCallback(async () => {
    if (!getStoredToken()) return
    try {
      const data = await inAppNotificationService.getRecent()
      setUnread(data.unreadCount ?? 0)
    } catch {
      setUnread(0)
    }
  }, [])

  useEffect(() => {
    loadUnread()
    const id = setInterval(loadUnread, 20000)
    const onVis = () => {
      if (document.visibilityState === 'visible') loadUnread()
    }
    const onRefresh = () => loadUnread()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('habitly:refresh-notifications', onRefresh)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('habitly:refresh-notifications', onRefresh)
    }
  }, [loadUnread])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const handleToggle = () => {
    setOpen((o) => {
      if (!o) setUnread(0)
      return !o
    })
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative w-9 h-9 sm:w-[34px] sm:h-[34px] rounded-full bg-[#F2EDE6] border border-[rgba(100,80,60,0.15)] flex items-center justify-center text-[#8C6E52] text-[15px]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <i className="ti ti-bell" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 border-[1.5px] border-[#FAF8F5]" />
        )}
      </button>
      {open && (
        <NotificationDropdown
          onClose={() => {
            setOpen(false)
            loadUnread()
          }}
        />
      )}
    </div>
  )
}
