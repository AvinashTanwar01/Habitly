import axios from 'axios'

const TOKEN_KEY = 'habitly_token'
const LEGACY_TOKEN_KEYS = ['token', 'authToken', 'jwt']

/** In dev, use Vite proxy (/api → :5000) so auth headers stay same-origin as localhost:3000 */
const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:5000/api')

const api = axios.create({
  baseURL,
  timeout: 20000,
})

export function getStoredToken() {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (raw) return raw.trim()
  for (const key of LEGACY_TOKEN_KEYS) {
    const legacy = localStorage.getItem(key)?.trim()
    if (legacy) {
      localStorage.setItem(TOKEN_KEY, legacy)
      localStorage.removeItem(key)
      return legacy
    }
  }
  return null
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.skipAuthRedirect) {
      localStorage.removeItem(TOKEN_KEY)
      const p = window.location.pathname
      const skip =
        p.startsWith('/login') ||
        p.startsWith('/signup') ||
        p.startsWith('/leaderboard') ||
        p.startsWith('/invite') ||
        p === '/'
      if (!skip) {
        const ret = encodeURIComponent(p + window.location.search)
        window.location.href = `/login?redirect=${ret}`
      }
    }
    return Promise.reject(err)
  }
)

export { TOKEN_KEY }
export default api
