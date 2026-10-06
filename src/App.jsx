import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider } from './components/Toaster'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import Icon from './components/Icon'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Caja from './pages/Caja'
import Categories from './pages/Categories'
import Tags from './pages/Tags'
import Reposicion from './pages/Reposicion'
import History from './pages/History'
import Users from './pages/Users'

const NAV = [
  { to: '/products', label: 'Productos', icon: 'box' },
  { to: '/sales', label: 'Ventas', icon: 'sales' },
  { to: '/caja', label: 'Caja', icon: 'caja' },
  { to: '/categories', label: 'Categorías', icon: 'categories' },
  { to: '/tags', label: 'Etiquetas', icon: 'tags' },
  { to: '/reposicion', label: 'Reposición', icon: 'reposicion' },
  { to: '/history', label: 'Historial', icon: 'history' },
  { to: '/users', label: 'Usuarios', icon: 'users', adminOnly: true },
]

function ThemeToggle({ variant = 'icon' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  if (variant === 'full') {
    return (
      <button className="theme-toggle-row" onClick={toggleTheme} aria-label={label}>
        <Icon name={isDark ? 'sun' : 'moon'} size={16} />
        {isDark ? 'Modo claro' : 'Modo oscuro'}
      </button>
    )
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={label}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={18} />
    </button>
  )
}

function AppShell() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const isAdmin = user?.groups?.includes('ADMIN')
  const visibleNav = NAV.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1 className="logo">Stock</h1>
            <p className="brand-caption">Control de inventario</p>
          </div>
        </div>
        <nav aria-label="Navegación principal">
          <ul className="nav-list">
            {visibleNav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="session-panel">
          <div className="session-user-row">
            <span className="session-user">{user?.username || 'Usuario'}</span>
          </div>
          <ThemeToggle variant="full" />
          <button className="btn session-logout" onClick={signOut}>
            <Icon name="logout" size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <span className="logo">Stock</span>
            <span className="brand-caption">Control de inventario</span>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <button className="btn btn-ghost btn-small mobile-logout" onClick={signOut}>
              <Icon name="logout" size={14} />
              Salir
            </button>
          </div>
        </header>
        <nav className="mobile-nav" aria-label="Navegación principal">
          {visibleNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <Icon name={item.icon} size={14} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="main-content" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="/products" element={<Products />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/reposicion" element={<Reposicion />} />
            <Route path="/history" element={<History />} />
            <Route path="/users" element={isAdmin ? <Users /> : <Navigate to="/products" replace />} />
            <Route path="*" element={<Navigate to="/products" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<AppShell />} />
        </Route>
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
    </ToastProvider>
  )
}

export default App
