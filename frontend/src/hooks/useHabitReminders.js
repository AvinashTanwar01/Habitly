import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { habitService } from '../services/habitService'
import { useToast } from '../context/ToastContext'
import { getEffectiveToday } from '../utils/streakUtils'
function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function normalizeReminderTime(value) {
  if (!value) return null
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`
}

const STORAGE_KEY = 'habitly_reminders_fired'

function loadFired() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function saveFired(set) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set].slice(-200)))
}

/**
 * While the app is open: toast + system notification at each habit's reminderTime.
 * Backend scheduler handles the same when the server is running (in-app bell + push).
 */
export function useHabitReminders() {
  const { user } = useAuth()
  const { toast } = useToast()
  const firedRef = useRef(loadFired())

  useEffect(() => {
    if (!user) return

    const tick = async () => {
      const now = nowHHMM()
      try {
        const habits = await habitService.getToday()
        const today = getEffectiveToday(new Date(), user.resetTime)

        for (const h of habits) {
          if (h.isDone) continue
          const rt = normalizeReminderTime(h.reminderTime)
          if (!rt || rt !== now) continue

          const key = `${h._id}-${today}-${now}`
          if (firedRef.current.has(key)) continue
          firedRef.current.add(key)
          saveFired(firedRef.current)

          const body = `Time for: ${h.icon || '🌱'} ${h.name}`
          toast.info(body, 10000)

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Habitly Reminder 🌱', {
                body,
                icon: '/favicon.ico',
                tag: key,
              })
            } catch {
              /* ignore */
            }
          }

          window.dispatchEvent(new CustomEvent('habitly:refresh-notifications'))
        }
      } catch {
        /* habits fetch failed — skip tick */
      }
    }

    tick()
    const id = setInterval(tick, 20000)
    return () => clearInterval(id)
  }, [user, toast])
}
