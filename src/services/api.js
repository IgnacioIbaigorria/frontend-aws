import axios from 'axios'

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

export default api

/** Extrae el mensaje de error del backend (NestJS devuelve { message } o { error }) */
export const apiError = (err) => {
  const data = err.response?.data
  if (data?.message) return data.message
  if (data?.error) return data.error
  return 'No se pudo conectar con el servidor'
}
