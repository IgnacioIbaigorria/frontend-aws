import api from './api'

export const listUsers = (params = {}) => api.get('/users', { params })

export const createUser = (payload) => api.post('/users', payload)

export const updateUser = (username, payload) =>
  api.patch(`/users/${encodeURIComponent(username)}`, payload)

export const resetUserPassword = (username, password) =>
  api.post(`/users/${encodeURIComponent(username)}/password`, { password })

export const deleteUser = (username) =>
  api.delete(`/users/${encodeURIComponent(username)}`)
