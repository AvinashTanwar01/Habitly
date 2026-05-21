import api from './api'

export const inAppNotificationService = {
  list: () => api.get('/notifications/in-app').then((r) => r.data),
  getRecent: () => api.get('/notifications/recent').then((r) => r.data),
  markRead: () => api.post('/notifications/mark-read').then((r) => r.data),
  markOne: (id) => api.patch(`/notifications/in-app/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/in-app/read-all').then((r) => r.data),
}
