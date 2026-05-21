import api, { TOKEN_KEY } from './api'

export const authService = {
  signup: async (data) => {
    const r = await api.post('/auth/signup', data)
    localStorage.setItem(TOKEN_KEY, r.data.token)
    return r.data.user
  },
  login: async (data) => {
    const r = await api.post('/auth/login', data)
    localStorage.setItem(TOKEN_KEY, r.data.token)
    return r.data.user
  },
  googleLogin: async (googleToken) => {
    const r = await api.post('/auth/google', { googleToken })
    localStorage.setItem(TOKEN_KEY, r.data.token)
    return r.data.user
  },
  linkGoogle: async (googleToken) => {
    const r = await api.post('/auth/google/link', { googleToken })
    return r.data.user
  },
  getMe: async () => {
    const r = await api.get('/auth/me')
    return r.data.user
  },
  updateProfile: (data) => api.put('/auth/profile', data).then((r) => r.data.user),
  uploadAvatar: async (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await api.post('/auth/upload-avatar', formData)
    return response.data
  },
  updatePassword: (data) => api.put('/auth/password', data).then((r) => r.data),
  disconnectGoogle: () => api.delete('/auth/google').then((r) => r.data.user),
  deleteAccount: () => api.delete('/auth/me').then((r) => r.data),
  logout: () => localStorage.removeItem(TOKEN_KEY),
}
