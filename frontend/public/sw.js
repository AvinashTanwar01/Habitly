/* Habitly service worker v2 */
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Habitly', body: 'You have a new notification' }
  const tag = data.tag || 'habitly-' + Date.now()
  event.waitUntil(
    self.registration.showNotification(data.title || 'Habitly', {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag,
      renotify: true,
      requireInteraction: false,
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  const fullUrl = new URL(url, self.location.origin).href
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(fullUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(fullUrl)
    })
  )
})
