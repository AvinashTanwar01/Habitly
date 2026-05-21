import api from './api'

export const habitService = {
  getAll: () => api.get('/habits').then((r) => r.data),
  getOne: (id) => api.get(`/habits/${id}`).then((r) => r.data),
  getCompletions: (id) => api.get(`/habits/${id}/completions`).then((r) => r.data),
  getToday: () => api.get('/habits/today').then((r) => r.data),
  create: (data) => api.post('/habits', data).then((r) => r.data),
  update: (id, data) => api.put(`/habits/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/habits/${id}`).then((r) => r.data),
  complete: (id, data) => api.post(`/habits/${id}/complete`, data).then((r) => r.data),
  uncomplete: (id, data) => api.post(`/habits/${id}/uncomplete`, data).then((r) => r.data),
  archive: (id) => api.put(`/habits/${id}/archive`).then((r) => r.data),
  archiveAll: () => api.put('/habits/archive-all').then((r) => r.data),
  getArchived: () => api.get('/habits/archived').then((r) => r.data),
  unarchive: (id) => api.put(`/habits/${id}/unarchive`).then((r) => r.data),
}
