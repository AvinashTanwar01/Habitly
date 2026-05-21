import api from './api'

export const taskService = {
  getByGroup: (groupId) => api.get(`/tasks/group/${groupId}`).then((r) => r.data),
  create: (groupId, data) => api.post(`/tasks/group/${groupId}`, data).then((r) => r.data),
  update: (id, data) => api.put(`/tasks/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
  complete: (id) => api.post(`/tasks/${id}/complete`).then((r) => r.data),
}
