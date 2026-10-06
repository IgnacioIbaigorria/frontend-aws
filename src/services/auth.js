import api, { apiError } from './api'
import {
  clearAuthSession,
  getStoredRefreshToken,
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
    setAuthSession(session)
    return session
  } catch (error) {
    throw new Error(apiError(error, 'Usuario o contraseña incorrectos'))
  }
}

export const refreshAccessToken = async () => {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) {
    throw new Error('No existe una sesión renovable')
  }

  try {
    const { data } = await api.post('/auth/refresh', { refreshToken })
    const session = normalizeAuthResponse({ ...data, refreshToken })
    setAuthSession(session)
    return session
  } catch (error) {
    clearAuthSession()
    throw new Error(apiError(error, 'La sesión expiró'))
  }
}

export const logout = () => {
  clearAuthSession()
}

