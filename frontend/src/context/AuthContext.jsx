import { createContext, useContext, useState, useEffect } from 'react'
import { googleLogout } from '@react-oauth/google'
import { authService } from '../services/authService'
import { notificationService } from '../services/notificationService'
import { TOKEN_KEY, getStoredToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }
    authService
      .getMe()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const login = async (data) => {
    const u = await authService.login(data)
    setUser(u)
    return u
  }

  const signup = async (data) => {
    const u = await authService.signup(data)
    setUser(u)
    return u
  }

  const googleLogin = async (credential) => {
    const u = await authService.googleLogin(credential)
    setUser(u)
    return u
  }

  const linkGoogle = async (credential) => {
    const u = await authService.linkGoogle(credential)
    setUser(u)
    return u
  }

  const logout = async () => {
    try {
      await notificationService.unsubscribe()
    } catch {
      /* no push subscription or SW unavailable */
    }
    try {
      googleLogout()
    } catch {
      /* Google SDK not active */
    }
    authService.logout()
    setUser(null)
  }

  const refreshUser = async () => {
    const u = await authService.getMe()
    setUser(u)
    return u
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        googleLogin,
        linkGoogle,
        logout,
        loading,
        refreshUser,
        updateUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
