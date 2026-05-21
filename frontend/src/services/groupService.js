import api from './api'

export const groupService = {
  getAll: () => api.get('/groups').then((r) => r.data),
  getUsage: () => api.get('/groups/usage').then((r) => r.data),
  create: (data) => api.post('/groups', { name: data?.name ?? data }).then((r) => r.data),
  getOne: (id) => api.get(`/groups/${id}`).then((r) => r.data),
  getInvitePreview: (code) => api.get(`/groups/invite/${code}`).then((r) => r.data),
  inviteByUsername: (id, username) => api.post(`/groups/${id}/invite/username`, { username }).then((r) => r.data),
  inviteByEmail: (id, email) => api.post(`/groups/${id}/invite/email`, { email }).then((r) => r.data),
  join: (code) => api.post(`/groups/join/${code}`).then((r) => r.data),
  leave: (id) => api.delete(`/groups/${id}/leave`).then((r) => r.data),
  deleteGroup: (id) => api.delete(`/groups/${id}`).then((r) => r.data),
  createNote: (id, data) => api.post(`/groups/${id}/notes`, data).then((r) => r.data),
  updateNote: (id, noteId, data) => api.put(`/groups/${id}/notes/${noteId}`, data).then((r) => r.data),
  deleteNote: (id, noteId) => api.delete(`/groups/${id}/notes/${noteId}`).then((r) => r.data),
}
