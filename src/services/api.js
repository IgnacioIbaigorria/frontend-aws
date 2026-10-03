import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

export default api

/** Extrae el mensaje de error del backend (NestJS devuelve { message } o { error }) */
export const apiError = (err) => {
  const data = err.response?.data
  if (data?.message) return data.message
  if (data?.error) return data.error
  return 'No se pudo conectar con el servidor'
}
