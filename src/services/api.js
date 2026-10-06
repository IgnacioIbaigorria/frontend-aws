import axios from 'axios'
import { clearAuthSession, getAccessToken, getStoredUsername, setAuthSession } from './authStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    const method = config?.method?.toLowerCase()
    const status = error.response?.status

    if (status === 401 && config && !config._authRetry && !config.url?.includes('/auth/')) {
      const username = getStoredUsername()
      if (username) {
        config._authRetry = true
        try {
          // El refresh token viaja como cookie HttpOnly (la adjunta el navegador)
          const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { username })
          setAuthSession({ ...data, username })
          config.headers.Authorization = `Bearer ${getAccessToken()}`
          return api(config)
        } catch {
          clearAuthSession()
          window.dispatchEvent(new Event('auth:expired'))
        }
      }
    }

    const retryableStatus = !status || [408, 429, 500, 502, 503, 504].includes(status)

    if (!config || method !== 'get' || !retryableStatus) {
      return Promise.reject(error)
    }

    config.__retryCount = config.__retryCount || 0
    if (config.__retryCount >= 2) {
      return Promise.reject(error)
    }

    config.__retryCount += 1
    await wait(config.__retryCount * 750)
    return api(config)
  }
)

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token && !config.url?.includes('/auth/')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

/** Extrae el mensaje de error del backend (NestJS devuelve { message } o { error }) */
export const apiError = (err, fallback = 'No se pudo conectar con el servidor') => {
  const data = err.response?.data
  if (data?.message) return data.message
  if (data?.error) return data.error
  return fallback
}
