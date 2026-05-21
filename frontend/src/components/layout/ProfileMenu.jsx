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
    document.addEventListener('touchstart', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <Avatar user={user} size={34} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-[100] min-w-[200px] max-w-[min(280px,calc(100vw-2rem))] bg-white border border-[rgba(100,80,60,0.15)] rounded-xl shadow-lg py-2 animate-[fadeIn_0.15s_ease-out] md:top-10 md:bottom-auto bottom-11"
        >
          <div className="px-3.5 py-2.5 border-b border-[rgba(100,80,60,0.1)]">
            <p className="text-sm font-semibold text-[#1C1917] truncate">{user?.displayName}</p>
            <p className="text-xs text-[#9A8070] truncate">{user?.email}</p>
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm text-[#1C1917] hover:bg-[#FAF8F5] active:bg-[#F2EDE6]"
          >
            Settings
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm text-[#1C1917] hover:bg-[#FAF8F5] active:bg-[#F2EDE6] md:hidden"
          >
            Leaderboard
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-left px-3.5 py-2.5 text-sm text-[#DC2626] hover:bg-[#FEF2F2] active:bg-[#FEF2F2] disabled:opacity-60"
          >
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  )
}
