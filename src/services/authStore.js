const STORAGE_KEY = 'stock-auth-session'

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

export const setAuthSession = ({ accessToken: nextAccessToken, refreshToken, expiresIn }) => {
  accessToken = nextAccessToken
  const payload = decodeJwtPayload(nextAccessToken)
  user = payload
    ? {
        username: payload.username || payload['cognito:username'] || 'Usuario',
        groups: payload['cognito:groups'] || [],
        expiresAt: payload.exp ? payload.exp * 1000 : Date.now() + expiresIn * 1000
      }
    : null

  if (refreshToken) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ refreshToken }))
  }
}

export const getStoredRefreshToken = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')?.refreshToken || null
  } catch {
    return null
  }
}

export const clearAuthSession = () => {
  accessToken = null
  user = null
  sessionStorage.removeItem(STORAGE_KEY)
}

