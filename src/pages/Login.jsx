import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const PASSWORD_RULES = [
  { id: 'length', label: 'Al menos 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'Al menos una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'Al menos una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'Al menos un número', test: (p) => /\d/.test(p) },
]

function validatePassword(password) {
  return PASSWORD_RULES.map((rule) => ({ ...rule, valid: rule.test(password) }))
}

function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const passwordRules = validatePassword(form.password)
  const isPasswordValid = passwordRules.every((r) => r.valid)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.username.trim() || !form.password) {
      setError('Completá tu usuario y contraseña.')
      return
    }

    if (!isPasswordValid) {
      setError('La contraseña no cumple con todos los requisitos de seguridad.')
      return
    }

    setIsSubmitting(true)
    try {
      await signIn(form.username.trim(), form.password)
      const destination = location.state?.from?.pathname || '/products'
      navigate(destination, { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="logo">Stock</p>
            <p className="brand-caption">Control de inventario</p>
          </div>
        </div>
        <h1 id="login-title" className="page-title">Ingresar</h1>
        <p className="page-sub">Usá tus credenciales para acceder al panel.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username">Usuario o email</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-describedby="password-rules"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                disabled={isSubmitting}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
              </button>
            </div>
            {form.password.length > 0 && (
              <ul className="password-rules" id="password-rules" aria-live="polite">
                {passwordRules.map((rule) => (
                  <li key={rule.id} className={rule.valid ? 'valid' : 'invalid'}>
                    <span className="password-rule-icon" aria-hidden="true">
                      {rule.valid ? '✓' : '○'}
                    </span>
                    {rule.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default Login
