import api from './api'

export const statsService = {
  getLeaderboard: () => api.get('/stats/leaderboard').then((r) => r.data),
  getLandingStats: () => api.get('/stats/landing').then((r) => r.data),
  getStreak: (habitId) => api.get(`/stats/streak/${habitId}`).then((r) => r.data),
  getWeekly: () => api.get('/stats/weekly').then((r) => r.data),
  getSummary: () => api.get('/stats/summary').then((r) => r.data),
}
