import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { useToast } from '../components/Toaster'
import { apiError } from '../services/api'
import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  updateUser
} from '../services/users'
import { fmtDate } from '../utils/format'

const EMPTY_FORM = {
  username: '',
  password: '',
  email: '',
  name: '',
  phoneNumber: '',
  roles: []
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SELLER', label: 'Vendedor' },
  { value: 'INVENTORY_MANAGER', label: 'Encargado de inventario' },
  { value: 'AUDITOR', label: 'Auditor' }
]

const PASSWORD_RULES = [
  { id: 'length', label: 'Entre 8 y 99 caracteres', test: (value) => value.length >= 8 && value.length <= 99 },
  { id: 'uppercase', label: 'Una letra mayúscula', test: (value) => /[A-Z]/.test(value) },
  { id: 'lowercase', label: 'Una letra minúscula', test: (value) => /[a-z]/.test(value) },
  { id: 'number', label: 'Un número', test: (value) => /\d/.test(value) },
  { id: 'special', label: 'Un carácter especial', test: (value) => /[^\w\s]/.test(value) }
]

const validatePassword = (password) =>
  PASSWORD_RULES.map((rule) => ({ ...rule, valid: rule.test(password) }))

const hasValidPassword = (password) =>
  validatePassword(password).every((rule) => rule.valid)

const toOptionalPayload = (form) => ({
  username: form.username.trim(),
  password: form.password,
  ...(form.email.trim() ? { email: form.email.trim() } : {}),
  ...(form.name.trim() ? { name: form.name.trim() } : {}),
  ...(form.phoneNumber.trim() ? { phoneNumber: form.phoneNumber.trim() } : {}),
  roles: form.roles
})

function PasswordRules({ password, id }) {
  if (!password) return null

  return (
    <ul className="password-rules" id={id} aria-live="polite">
      {validatePassword(password).map((rule) => (
        <li key={rule.id} className={rule.valid ? 'valid' : 'invalid'}>
          <span className="password-rule-icon" aria-hidden="true">
            {rule.valid ? '✓' : '○'}
          </span>
          {rule.label}
        </li>
      ))}
    </ul>
  )
}

function PasswordInput({ id, value, onChange, show, onToggle, describedBy }) {
  return (
    <div className="password-field">
      <input
        id={id}
        name={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={onToggle}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={show}
      >
        <Icon name={show ? 'eye-off' : 'eye'} size={18} />
      </button>
    </div>
  )
}

function Users() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [nextToken, setNextToken] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ email: '', name: '', phoneNumber: '', enabled: true, roles: [] })
  const [resetPassword, setResetPassword] = useState('')
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadUsers = async (paginationToken = null, append = false) => {
    try {
      const params = { limit: 60 }
      if (paginationToken) params.nextToken = paginationToken
      const { data } = await listUsers(params)
      setUsers((current) => (append ? [...current, ...(data.users || [])] : (data.users || [])))
      setNextToken(data.nextToken || null)
    } catch (error) {
      toast(apiError(error), 'error')
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const toggleRole = (field, role) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(role)
        ? current[field].filter((value) => value !== role)
        : [...current[field], role]
    }))
  }

  const toggleEditRole = (role) => {
    setEditForm((current) => ({
      ...current,
      roles: current.roles.includes(role)
        ? current.roles.filter((value) => value !== role)
        : [...current.roles, role]
    }))
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!hasValidPassword(form.password)) {
      toast('La contraseña no cumple todos los requisitos.', 'error')
      return
    }

    setIsSaving(true)
    try {
      await createUser(toOptionalPayload(form))
      toast('Usuario creado')
      setForm(EMPTY_FORM)
      await loadUsers()
    } catch (error) {
      toast(apiError(error), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (user) => {
    setEditing(user.username)
    setEditForm({
      email: user.attributes?.email || '',
      name: user.attributes?.name || '',
      phoneNumber: user.attributes?.phone_number || '',
      enabled: user.enabled !== false,
      roles: user.roles || []
    })
    setResetPassword('')
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await updateUser(editing, {
        email: editForm.email.trim() || undefined,
        name: editForm.name.trim() || undefined,
        phoneNumber: editForm.phoneNumber.trim() || undefined,
        enabled: editForm.enabled,
        roles: editForm.roles
      })
      toast('Usuario actualizado')
      setEditing(null)
      await loadUsers()
    } catch (error) {
      toast(apiError(error), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    if (!hasValidPassword(resetPassword)) {
      toast('La contraseña no cumple todos los requisitos.', 'error')
      return
    }

    setIsSaving(true)
    try {
      await resetUserPassword(editing, resetPassword)
      toast('Contraseña actualizada')
      setResetPassword('')
    } catch (error) {
      toast(apiError(error), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (username) => {
    if (!window.confirm(`¿Eliminar el usuario "${username}"?`)) return

    try {
      await deleteUser(username)
      toast('Usuario eliminado')
      if (editing === username) setEditing(null)
      await loadUsers()
    } catch (error) {
      toast(apiError(error), 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Usuarios</h1>
      </div>

      <div className="card">
        <h3 className="card-title">Crear usuario</h3>
        <form onSubmit={handleCreate}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input id="username" name="username" value={form.username} onChange={updateForm} required />
            </div>
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <PasswordInput
                id="password"
                value={form.password}
                onChange={updateForm}
                show={showCreatePassword}
                onToggle={() => setShowCreatePassword((current) => !current)}
                describedBy="create-password-rules"
              />
              <PasswordRules password={form.password} id="create-password-rules" />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={updateForm} />
            </div>
            <div className="form-group">
              <label htmlFor="name">Nombre</label>
              <input id="name" name="name" value={form.name} onChange={updateForm} />
            </div>
            <div className="form-group">
              <label htmlFor="phoneNumber">Teléfono</label>
              <input id="phoneNumber" name="phoneNumber" value={form.phoneNumber} onChange={updateForm} />
            </div>
            <fieldset className="form-group role-field">
              <legend>Permisos</legend>
              <div className="role-options">
                {ROLE_OPTIONS.map((role) => (
                  <label key={role.value} className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={form.roles.includes(role.value)}
                      onChange={() => toggleRole('roles', role.value)}
                    />
                    {role.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <button className="btn btn-primary" type="submit" disabled={isSaving}>Crear usuario</button>
        </form>
      </div>

      {editing && (
        <div className="card">
          <h3 className="card-title">Editar usuario: {editing}</h3>
          <form onSubmit={handleUpdate}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="edit-email">Email</label>
                <input id="edit-email" type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-name">Nombre</label>
                <input id="edit-name" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-phone">Teléfono</label>
                <input id="edit-phone" value={editForm.phoneNumber} onChange={(event) => setEditForm({ ...editForm, phoneNumber: event.target.value })} />
              </div>
              <label className="checkbox-field">
                <input type="checkbox" checked={editForm.enabled} onChange={(event) => setEditForm({ ...editForm, enabled: event.target.checked })} />
                Usuario habilitado
              </label>
              <fieldset className="form-group role-field span-2">
                <legend>Permisos</legend>
                <div className="role-options">
                  {ROLE_OPTIONS.map((role) => (
                    <label key={role.value} className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={editForm.roles.includes(role.value)}
                        onChange={() => toggleEditRole(role.value)}
                      />
                      {role.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={isSaving}>Guardar cambios</button>
              <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </form>

          <form className="reset-password-form" onSubmit={handleResetPassword}>
            <h4 className="card-title">Restablecer contraseña</h4>
            <div className="form-group">
              <label htmlFor="reset-password">Nueva contraseña</label>
              <PasswordInput
                id="reset-password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                show={showResetPassword}
                onToggle={() => setShowResetPassword((current) => !current)}
                describedBy="reset-password-rules"
              />
              <PasswordRules password={resetPassword} id="reset-password-rules" />
            </div>
            <button className="btn btn-ghost" type="submit" disabled={isSaving}>Actualizar contraseña</button>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Usuarios registrados</h3>
        {users.length === 0 ? (
          <div className="empty-state"><p>Sin usuarios registrados.</p></div>
        ) : (
          <div className="table-wrap responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Permisos</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.username}>
                    <td className="product-name" data-label="Usuario">{user.username}</td>
                    <td data-label="Nombre">{user.attributes?.name || '-'}</td>
                    <td data-label="Email">{user.attributes?.email || '-'}</td>
                    <td data-label="Estado">
                      <span className={`status-pill ${user.enabled === false ? 'status-disabled' : 'status-enabled'}`}>
                        {user.enabled === false ? 'Deshabilitado' : 'Habilitado'}
                      </span>
                    </td>
                    <td data-label="Permisos">
                      {user.roles?.length ? user.roles.join(', ') : 'Sin permisos'}
                    </td>
                    <td className="mono" data-label="Creado">{fmtDate(user.createdAt)}</td>
                    <td data-label="Acciones">
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-small" onClick={() => startEditing(user)}>Editar</button>
                        <button className="btn btn-danger btn-small" onClick={() => handleDelete(user.username)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {nextToken && (
          <button className="btn btn-ghost load-more" onClick={() => loadUsers(nextToken, true)}>Cargar más</button>
        )}
      </div>
    </div>
  )
}

export default Users
