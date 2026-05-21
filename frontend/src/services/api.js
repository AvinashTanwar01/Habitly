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

const cache = new Map()

const originalGet = api.get
const originalPost = api.post
const originalPut = api.put
const originalDelete = api.delete

function clearCache() {
  cache.clear()
}

api.post = function (url, data, config) {
  clearCache()
  return originalPost.call(this, url, data, config)
}

api.put = function (url, data, config) {
  clearCache()
  return originalPut.call(this, url, data, config)
}

api.delete = function (url, config) {
  clearCache()
  return originalDelete.call(this, url, config)
}

api.get = function (url, config = {}) {
  const cacheableUrls = ['/habits/today', '/stats/summary', '/stats/weekly']
  const shouldCache = cacheableUrls.some(cu => url === cu || url.endsWith(cu))

  if (!shouldCache || config.skipCache) {
    return originalGet.call(this, url, config)
  }

  const cached = cache.get(url)
  const now = Date.now()

  if (cached && now < cached.expires) {
    // Background revalidation
    originalGet.call(this, url, { ...config, skipCache: true })
      .then((res) => {
        const isDifferent = JSON.stringify(res.data) !== JSON.stringify(cached.data)
        cache.set(url, {
          data: res.data,
          expires: Date.now() + 30000,
          response: {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
            config: res.config
          }
        })
        if (isDifferent) {
          const event = new CustomEvent('api-cache-update', {
            detail: { url, data: res.data }
          })
          window.dispatchEvent(event)
        }
      })
      .catch((err) => {
        console.warn(`[cache-revalidate] Background fetch failed for ${url}:`, err.message)
      })

    return Promise.resolve({ ...cached.response, data: cached.data })
  }

  return originalGet.call(this, url, config).then((res) => {
    cache.set(url, {
      data: res.data,
      expires: Date.now() + 30000,
      response: {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        config: res.config
      }
    })
    return res
  })
}

export { TOKEN_KEY }
export default api
