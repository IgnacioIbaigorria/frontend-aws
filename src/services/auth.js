import api, { apiError } from './api'
import {
  clearAuthSession,
  getStoredRefreshToken,
  getStoredUsername,
  setAuthSession
} from './authStore'

const normalizeAuthResponse = (data) => ({
  accessToken: data.accessToken,
  refreshToken: data.refreshToken,
  expiresIn: data.expiresIn || 3600
})

export const login = async (username, password) => {
  try {
    const { data } = await api.post('/auth/login', { username, password })
    const session = normalizeAuthResponse(data)
    setAuthSession({ ...session, username })
    return session
  } catch (error) {
    throw new Error(apiError(error, 'Usuario o contraseña incorrectos'))
  }
}

export const refreshAccessToken = async () => {
  const refreshToken = getStoredRefreshToken()
  const username = getStoredUsername()
  if (!refreshToken || !username) {
    throw new Error('No existe una sesión renovable')
  }

  try {
    const { data } = await api.post('/auth/refresh', { refreshToken, username })
    const session = normalizeAuthResponse({ ...data, refreshToken })
    setAuthSession({ ...session, username })
    return session
  } catch (error) {
    clearAuthSession()
    throw new Error(apiError(error, 'La sesión expiró'))
  }
}

export const logout = () => {
  clearAuthSession()
}

