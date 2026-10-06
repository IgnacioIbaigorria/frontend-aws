export const STORAGE_KEY = 'stock-auth-session'

let accessToken = null
let user = null

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = decodeURIComponent(
      window
        .atob(normalized)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    )
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export const getAccessToken = () => accessToken

export const getCurrentUser = () => user

export const setAuthSession = ({ accessToken: nextAccessToken, expiresIn = 3600, username }) => {
  accessToken = nextAccessToken
  const payload = decodeJwtPayload(nextAccessToken)
  user = payload
    ? {
        username: payload.username || payload['cognito:username'] || username || 'Usuario',
        groups: payload['cognito:groups'] || [],
        expiresAt: payload.exp ? payload.exp * 1000 : Date.now() + expiresIn * 1000
      }
    : null

  // Se prioriza el username canónico de los claims del JWT: es el que Cognito
  // exige para el SECRET_HASH de /auth/refresh, y puede diferir en mayúsculas
  // del tipeado por el usuario (el login acepta cualquier case).
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ username: user?.username || username || 'Usuario' })
  )
}

export const getStoredUsername = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.username || null
  } catch {
    return null
  }
}

export const clearAuthSession = () => {
  accessToken = null
  user = null
  localStorage.removeItem(STORAGE_KEY)
}

