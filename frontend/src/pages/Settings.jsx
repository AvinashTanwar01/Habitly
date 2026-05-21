import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/authService'
import { habitService } from '../services/habitService'
import { notificationService } from '../services/notificationService'
import { useToast } from '../context/ToastContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Avatar from '../components/ui/Avatar'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Settings() {
  const { user, refreshUser, updateUser, logout, linkGoogle } = useAuth()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [googleLinking, setGoogleLinking] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState('account')
  const [displayName, setDisplayName] = useState('')
  const [resetTime, setResetTime] = useState('00:00')
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [habits, setHabits] = useState([])
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifStatus, setNotifStatus] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setResetTime(user.resetTime || '00:00')
    }
    let cancelled = false
    setPageLoading(true)

    const withTimeout = (promise, ms) =>
      Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve(null), ms)),
      ])

    Promise.all([
      withTimeout(habitService.getAll().catch(() => []), 10000),
      withTimeout(notificationService.isSubscribed().catch(() => false), 3000),
    ])
      .then(([h, sub]) => {
        if (cancelled) return
        setHabits(Array.isArray(h) ? h : [])
        setNotifEnabled(!!sub)
      })
      .finally(() => {
        if (!cancelled) setPageLoading(false)
      })
    return () => { cancelled = true }
  }, [user])

  const confirmArchiveAll = async () => {
    setError('')
    try {
      await habitService.archiveAll()
      const h = await habitService.getAll()
      setHabits(Array.isArray(h) ? h : [])
      setArchiveOpen(false)
      setMsg('All habits archived')
      toast.success('All habits archived')
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to archive habits'
      setError(msg)
      toast.error(msg)
    }
  }

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB')
      return
    }
    setUploading(true)
    setUploadError('')
    try {
      const data = await authService.uploadAvatar(file)
      updateUser(data.user)
      toast.success('Profile picture updated!')
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed')
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const saveProfile = async (fields = {}) => {
    setError('')
    try {
      await authService.updateProfile({
        displayName,
        ...fields,
      })
      await refreshUser()
      setMsg('Profile saved')
      toast.success('Profile saved')
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to save'
      setError(msg)
      toast.error(msg)
    }
  }

  const saveReset = async () => {
    setError('')
    try {
      await authService.updateProfile({ resetTime })
      await refreshUser()
      setMsg('Reset time saved')
      toast.success('Day reset time saved')
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to save reset time'
      setError(msg)
      toast.error(msg)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    try {
      await authService.updatePassword(passwords)
      setMsg('Password updated')
      toast.success('Password updated')
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setPwdOpen(false)
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to update password'
      setError(msg)
      toast.error(msg)
    }
  }

  const toggleNotifications = async () => {
    if (notifLoading) return
    setNotifLoading(true)
    setNotifStatus('')
    setError('')

    const work = async () => {
      if (notifEnabled) {
        setNotifStatus('Turning off…')
        await notificationService.unsubscribe()
        setNotifEnabled(false)
        setNotifStatus('')
        toast.info('Browser reminders turned off')
      } else {
        setNotifStatus('Enabling…')
        await notificationService.requestPermission()
        setNotifEnabled(true)
        setNotifStatus('')
        toast.success('Browser reminders enabled')
      }
    }

    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out. Refresh the page and try again.')), 25000)
    })

    try {
      await Promise.race([work(), timeout])
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update notifications'
      setNotifEnabled(false)
      setNotifStatus('')
      setError(msg)
      toast.error(msg)
    } finally {
      setNotifLoading(false)
    }
  }

  const handleLogout = async () => {
    setError('')
    try {
      await logout()
      toast.info('Logged out')
      navigate('/login', { replace: true })
    } catch {
      toast.error('Could not log out')
    }
  }

  const deleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Type DELETE to confirm')
      return
    }
    setError('')
    try {
      await authService.deleteAccount()
      await logout()
      setDeleteOpen(false)
      setDeleteConfirmText('')
      toast.success('Account deleted')
      navigate('/')
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to delete account'
      setError(msg)
      toast.error(msg)
    }
  }

  const disconnectGoogle = async () => {
    setError('')
    try {
      await authService.disconnectGoogle()
      await refreshUser()
      setMsg('Google disconnected')
    } catch (e) {
      setError(e.response?.data?.message || 'Could not disconnect')
    }
  }

  const TABS = [
    { id: 'account', label: 'Account' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'danger', label: 'Danger zone' },
  ]

  if (!user) {
    return <p className="p-8 text-[#9A8070]">Loading account...</p>
  }

  return (
    <section className="p-6 lg:p-8 w-full min-h-full">
      {pageLoading && <p className="text-sm text-[#9A8070] mb-4">Loading settings...</p>}

      <nav className="flex gap-2 mb-6 border-b border-[rgba(100,80,60,0.12)] pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setError('') }}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              tab === t.id ? 'bg-[#1C1917] text-white' : 'text-[#8C6E52] hover:bg-[#F2EDE6]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {msg && <p className="mb-4 p-3 bg-green-50 text-green-800 text-sm rounded-xl">{msg}</p>}
      {error && <p className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</p>}

      {tab === 'account' && (
        <section className="space-y-6">
          <article className="bg-white border rounded-2xl p-5 space-y-4">
            <h2 className="font-medium flex items-center gap-2"><i className="ti ti-user" /> Account</h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '20px 0',
                borderBottom: '0.5px solid rgba(100,80,60,0.1)',
                marginBottom: 20,
              }}
            >
              <div style={{ position: 'relative' }}>
                <Avatar user={user} size={72} onClick={handleAvatarClick} style={{ cursor: 'pointer' }} />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleAvatarClick}
                  onKeyDown={(e) => e.key === 'Enter' && handleAvatarClick()}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#1C1917',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '2px solid #FAF8F5',
                    fontSize: 11,
                    color: 'white',
                  }}
                >
                  ✏️
                </div>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1917', marginBottom: 2 }}>
                  {user?.displayName}
                </p>
                <p style={{ fontSize: 13, color: '#9A8070', marginBottom: 8 }}>{user?.email}</p>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  style={{
                    fontSize: 12,
                    color: '#8C6E52',
                    background: '#F2EDE6',
                    border: '0.5px solid rgba(100,80,60,0.2)',
                    borderRadius: 6,
                    padding: '5px 12px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.7 : 1,
                  }}
                >
                  {uploading ? 'Uploading...' : 'Change photo'}
                </button>
                {uploadError && (
                  <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{uploadError}</p>
                )}
                <p style={{ fontSize: 11, color: '#9A8070', marginTop: 4 }}>
                  JPG, PNG or WebP · Max 5MB · Stored in Cloudinary
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <section className="flex gap-2">
              <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="flex-1" />
              <Button onClick={() => saveProfile()} className="self-end">Save</Button>
            </section>
            <Input label="Email" value={user?.email || ''} disabled />
            <button type="button" onClick={() => setPwdOpen(!pwdOpen)} className="text-sm text-[#8C6E52] underline">
              Change password
            </button>
            {pwdOpen && (
              <form onSubmit={changePassword} className="space-y-2 pt-2 border-t">
                <Input type="password" placeholder="Current password" value={passwords.oldPassword} onChange={(e) => setPasswords((p) => ({ ...p, oldPassword: e.target.value }))} />
                <Input type="password" placeholder="New password" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} />
                <Input type="password" placeholder="Confirm password" value={passwords.confirmPassword} onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))} />
                <Button type="submit">Update password</Button>
              </form>
            )}
          </article>

          <article className="bg-white border rounded-2xl p-5">
            <h2 className="font-medium flex items-center gap-2 mb-2"><i className="ti ti-clock" /> Daily reset time</h2>
            <p className="text-sm text-[#9A8070] mb-3">Your habit list resets at this time every day.</p>
            <section className="flex gap-2">
              <Input type="time" value={resetTime} onChange={(e) => setResetTime(e.target.value)} className="flex-1" />
              <Button onClick={saveReset}>Save</Button>
            </section>
          </article>

          <article className="bg-white border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-medium flex items-center gap-2"><i className="ti ti-logout" /> Session</h2>
              <p className="text-sm text-[#9A8070] mt-1">Sign out on this device. Your habits and data stay saved.</p>
            </div>
            <Button variant="outline" type="button" onClick={handleLogout}>
              Log out
            </Button>
          </article>

          <article className="bg-white border rounded-2xl p-5 space-y-3">
            <h2 className="font-medium mb-1">Google account</h2>
            <p className="text-sm text-[#9A8070]">
              Sign in with Google on the login page, or connect the Google account that uses <strong>{user?.email}</strong>.
            </p>
            {user?.googleId ? (
              <section className="space-y-2">
                <p className="text-sm text-green-700 font-medium">Connected ✓</p>
                {user?.hasPassword ? (
                  <Button variant="outline" type="button" onClick={disconnectGoogle}>
                    Disconnect Google
                  </Button>
                ) : (
                  <p className="text-xs text-[#9A8070]">Set a password above before you can disconnect Google.</p>
                )}
              </section>
            ) : googleClientId ? (
              <GoogleSignInButton
                disabled={googleLinking}
                context="signin"
                text="continue_with"
                onSuccess={async (res) => {
                  if (!res?.credential) {
                    setError('Google did not return a credential.')
                    return
                  }
                  setGoogleLinking(true)
                  setError('')
                  try {
                    await linkGoogle(res.credential)
                    await refreshUser()
                    setMsg('Google account connected')
                    toast.success('Google connected')
                  } catch (e) {
                    const m = e.response?.data?.message || e.message || 'Could not connect Google'
                    setError(m)
                    toast.error(m)
                  } finally {
                    setGoogleLinking(false)
                  }
                }}
                onError={(err) => {
                  setError(err.message || 'Google connect cancelled')
                  toast.error(err.message || 'Google connect failed')
                }}
              />
            ) : (
              <p className="text-sm text-[#9A8070]">Google OAuth not configured</p>
            )}
          </article>
        </section>
      )}

      {tab === 'notifications' && (
        <article className="bg-white border rounded-2xl p-5">
          <div className="flex justify-between items-center gap-4 mb-4">
            <h2 className="font-medium flex items-center gap-2"><i className="ti ti-bell" /> Notifications</h2>
            <button
              type="button"
              role="switch"
              aria-checked={notifEnabled}
              aria-busy={notifLoading}
              aria-label="Enable browser notifications"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleNotifications()
              }}
              disabled={notifLoading}
              className={`relative shrink-0 w-14 h-8 rounded-full border-0 p-0 transition-colors ${
                notifLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer hover:opacity-90'
              } ${notifEnabled ? 'bg-[#8C6E52]' : 'bg-[#EDE5DB]'}`}
            >
              <span
                aria-hidden
                className={`pointer-events-none absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  notifEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {notifLoading && notifStatus && (
            <p className="text-sm text-[#8C6E52] mb-3">{notifStatus}</p>
          )}
          {Notification.permission === 'denied' && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              Notifications are blocked in your browser. Open site settings (lock icon in the address bar) and allow notifications for localhost, then refresh.
            </p>
          )}
          <p className="text-sm text-[#9A8070] mb-4">
            Get reminded at each habit&apos;s reminder time, plus an evening nudge if you haven&apos;t completed today&apos;s habits.
            Closing a Chrome notification does not turn these off — only this toggle does. New alerts also appear in the bell at the top right.
          </p>
          <ul className="space-y-2 text-sm">
            {habits.map((h) => (
              <li key={h._id} className="flex justify-between py-2 border-b border-[rgba(100,80,60,0.08)] last:border-0">
                <span>{h.icon} {h.name}</span>
                <span className="text-[#9A8070]">{h.reminderTime || '—'}</span>
              </li>
            ))}
          </ul>
        </article>
      )}

      {tab === 'danger' && (
        <article className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h2 className="font-medium text-red-900 flex items-center gap-2 mb-2"><i className="ti ti-alert-triangle" /> Danger zone</h2>
          <p className="text-sm text-red-800 mb-4">These actions are permanent and cannot be undone.</p>
          <section className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setArchiveOpen(true)} className="border-red-300 text-red-800">
              Archive all habits
            </Button>
            <Button className="bg-red-700 hover:bg-red-800" onClick={() => { setDeleteOpen(true); setDeleteConfirmText(''); setError('') }}>
              Delete account
            </Button>
          </section>
        </article>
      )}

      {archiveOpen && (
        <section className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <section className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="mb-4 text-[#1C1917]">Archive all habits? They will disappear from your active list but stay in the archive.</p>
            <section className="flex gap-2">
              <Button variant="outline" className="flex-1" type="button" onClick={() => setArchiveOpen(false)}>Cancel</Button>
              <Button className="flex-1" type="button" onClick={confirmArchiveAll}>Archive all</Button>
            </section>
          </section>
        </section>
      )}

      {deleteOpen && (
        <section className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <section className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="mb-2 text-[#1C1917] font-medium">Delete your account and all data permanently?</p>
            <p className="text-sm text-[#9A8070] mb-3">Type DELETE to confirm.</p>
            <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="mb-4" />
            <section className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                type="button"
                onClick={() => { setDeleteOpen(false); setDeleteConfirmText('') }}
              >
                Cancel
              </Button>
              <Button className="flex-1 bg-red-700" type="button" onClick={deleteAccount}>Delete</Button>
            </section>
          </section>
        </section>
      )}
    </section>
  )
}
