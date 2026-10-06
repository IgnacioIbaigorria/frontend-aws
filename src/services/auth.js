import api, { apiError } from './api'
import {
  clearAuthSession,
  getStoredUsername,
  setAuthSession
} from './authStore'

const normalizeAuthResponse = (data) => ({
  accessToken: data.accessToken,
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
  const username = getStoredUsername()
  if (!username) {
    throw new Error('No existe una sesión renovable')
  }

  try {
    // El refresh token no viaja en el body: lo aporta el navegador en la
    // cookie HttpOnly que seteó /auth/login (same-origin, con path /api/auth).
    const { data } = await api.post('/auth/refresh', { username })
    const session = normalizeAuthResponse(data)
    setAuthSession({ ...session, username })
    return session
  } catch (error) {
    clearAuthSession()
    throw new Error(apiError(error, 'La sesión expiró'))
  }
}

export const logout = () => {
  // La cookie HttpOnly solo puede borrarla el servidor (el JS no la ve).
  // Se limpia el estado local de inmediato y el pedido se dispara en segundo
  // plano: si el backend no responde, la sesión local igual quedó cerrada.
  clearAuthSession()
  api.post('/auth/logout').catch(() => {})
}
