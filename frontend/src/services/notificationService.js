import api, { getStoredToken } from './api'

const SW_PATH = '/sw.js'

function trimKey(key) {
  return typeof key === 'string' ? key.trim() : ''
}

/** Decode VAPID public key to 65-byte uncompressed P-256 point (required by Push API). */
export function urlBase64ToUint8Array(base64String) {
  const key = trimKey(base64String)
  if (!key) throw new Error('VAPID public key is missing')
  const padding = '='.repeat((4 - (key.length % 4)) % 4)
  const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  if (output.length !== 65 || output[0] !== 4) {
    throw new Error('Invalid VAPID public key — regenerate keys with: cd backend && node scripts/generate-vapid.js')
  }
  return output
}

function authError(err) {
  if (err?.response?.status === 401) {
    return new Error('Session expired — log out and log in again, then retry.')
  }
  if (err?.response?.status === 503) {
    return new Error(err?.response?.data?.message || 'Push not configured on server.')
  }
  return null
}

async function fetchVapidPublicKey() {
  const r = await api.get('/notifications/public-key', {
    skipAuthRedirect: true,
    params: { _t: Date.now() },
  })
  const serverKey = trimKey(r.data?.publicKey)
  if (!serverKey || serverKey === 'to_be_provided') {
    throw new Error('Server has no VAPID key. Run: cd backend && node scripts/generate-vapid.js')
  }
  return serverKey
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Remove every SW + push subscription so Chrome/Brave can register cleanly. */
async function resetPushEnvironment() {
  const registrations = await navigator.serviceWorker.getRegistrations()
  for (const reg of registrations) {
    try {
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
    } catch {
      /* ignore */
    }
    try {
      await reg.unregister()
    } catch {
      /* ignore */
    }
  }
  await delay(300)
}

async function registerCleanServiceWorker() {
  const registration = await navigator.serviceWorker.register(SW_PATH, {
    scope: '/',
    updateViaCache: 'none',
  })

  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Service worker activation timed out')), 12000)
    const done = () => {
      clearTimeout(timeout)
      resolve(registration)
    }
    if (registration.active) {
      done()
      return
    }
    const worker = registration.installing || registration.waiting
    if (worker) {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') done()
      })
    }
    navigator.serviceWorker.addEventListener('controllerchange', done, { once: true })
  })

  return registration
}

async function createPushSubscription(registration, publicKey) {
  const keyBytes = urlBase64ToUint8Array(publicKey)
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    try {
      await existing.unsubscribe()
    } catch {
      /* ignore */
    }
    await delay(200)
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes,
  })
}

async function saveSubscriptionOnServer(subscription) {
  const token = getStoredToken()
  if (!token) throw new Error('Not logged in')
  await api.post(
    '/notifications/subscribe',
    { subscription: subscription.toJSON() },
    { skipAuthRedirect: true }
  )
}

async function subscribePushFlow() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser.')
  }
  if (window.location.hostname === '127.0.0.1') {
    throw new Error('Use http://localhost:3000 (not 127.0.0.1).')
  }

  const publicKey = await fetchVapidPublicKey()
  urlBase64ToUint8Array(publicKey)

  await resetPushEnvironment()
  const registration = await registerCleanServiceWorker()

  let subscription
  try {
    subscription = await createPushSubscription(registration, publicKey)
  } catch (err) {
    const msg = err?.message || ''
    if (/push service|registration failed|abort/i.test(msg)) {
      await resetPushEnvironment()
      await delay(500)
      const reg2 = await registerCleanServiceWorker()
      subscription = await createPushSubscription(reg2, publicKey)
    } else {
      throw err
    }
  }

  await saveSubscriptionOnServer(subscription)
  return subscription
}

function browserPushHint() {
  const ua = navigator.userAgent || ''
  if (/Brave/i.test(ua) || navigator.brave) {
    return ' In Brave: Settings → Shields → turn off for localhost, allow notifications, or try Chrome.'
  }
  return ' Use Chrome if this keeps failing. Clear site data for localhost:3000 and retry.'
}

export const notificationService = {
  urlBase64ToUint8Array,

  async requestPermission() {
    if (!('Notification' in window)) throw new Error('Notifications not supported')

    if (!getStoredToken()) {
      throw new Error('Log in first.')
    }

    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission === 'denied') {
      throw new Error('Notifications blocked — allow them in browser site settings (lock icon in address bar).')
    }
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted.')
    }

    try {
      return await subscribePushFlow()
    } catch (err) {
      if (authError(err)) throw authError(err)
      const detail = err?.message || 'unknown'
      throw new Error(`Push registration failed: ${detail}.${browserPushHint()}`)
    }
  },

  async ensureSubscribed() {
    if (!getStoredToken()) return false
    if (Notification.permission !== 'granted') return false
    try {
      await subscribePushFlow()
      return true
    } catch {
      return false
    }
  },

  async unsubscribe() {
    await resetPushEnvironment()
    const token = getStoredToken()
    if (token) {
      await api.delete('/notifications/unsubscribe', { skipAuthRedirect: true }).catch(() => {})
    }
  },

  async isSubscribed() {
    if (Notification.permission !== 'granted') return false
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) return false
      return !!(await reg.pushManager.getSubscription())
    } catch {
      return false
    }
  },
}
