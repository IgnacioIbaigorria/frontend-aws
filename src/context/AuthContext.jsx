import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { login as requestLogin, logout as clearSession, refreshAccessToken } from '../services/auth'
import { getCurrentUser, getStoredUsername, clearAuthSession, STORAGE_KEY } from '../services/authStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncUser = useCallback(() => {
    setUser(getCurrentUser())
  }, [])

  useEffect(() => {
    let active = true

    refreshAccessToken()
      .then(() => {
        if (active) syncUser()
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    const handleExpired = () => {
      if (active) setUser(null)
    }
    window.addEventListener('auth:expired', handleExpired)

    return () => {
      active = false
      window.removeEventListener('auth:expired', handleExpired)
    }
  }, [syncUser])

  // Sincroniza el cierre de sesión entre pestañas: si en otra pestaña se
  // cierra la sesión (se borra el refresh token de localStorage), esta pestaña
  // también sale. Las escrituras se ignoran a propósito para no generar
  // refrescos circulares de token entre pestañas.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return
      if (!getStoredUsername()) {
        clearAuthSession()
        setUser(null)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const signIn = useCallback(async (username, password) => {
    await requestLogin(username, password)
    syncUser()
  }, [syncUser])

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const hasRole = useCallback((...roles) => {
    const groups = user?.groups || []
    return roles.some((role) => groups.includes(role))
  }, [user])

  const isGuest = useCallback(() => hasRole('GUEST'), [hasRole])

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    hasRole,
    isGuest: isGuest(),
    signIn,
    signOut
  }), [user, isLoading, hasRole, isGuest, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

