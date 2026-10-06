import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider } from './components/Toaster'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Caja from './pages/Caja'
import Categories from './pages/Categories'
import Tags from './pages/Tags'
import Reposicion from './pages/Reposicion'
import History from './pages/History'

const NAV = [
  { to: '/products', label: 'Productos' },
  { to: '/sales', label: 'Ventas' },
  { to: '/caja', label: 'Caja' },
  { to: '/categories', label: 'Categorías' },
  { to: '/tags', label: 'Etiquetas' },
  { to: '/reposicion', label: 'Reposición' },
  { to: '/history', label: 'Historial' }
]

function AppShell() {
  const location = useLocation()
  const { user, signOut } = useAuth()

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
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            </ul>
          </nav>
          <div className="session-panel">
            <span className="session-user">{user?.username || 'Usuario'}</span>
            <button className="btn btn-ghost btn-small session-logout" onClick={signOut}>Cerrar sesión</button>
          </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <span className="logo">Stock</span>
            <span className="brand-caption">Control de inventario</span>
          </div>
          <button className="btn btn-ghost btn-small mobile-logout" onClick={signOut}>Salir</button>
        </header>
        <nav className="mobile-nav" aria-label="Navegación principal">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
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
