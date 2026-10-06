import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { apiError } from '../services/api'
import { money, num } from '../utils/format'
import { useToast } from '../components/Toaster'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const isLow = (p) => num(p.stock) <= num(p.minStock)

function Products() {
  const toast = useToast()
  const { isGuest } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')

  useEffect(() => {
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Búsqueda y filtro por categoría van al backend (search / categoryId)
  useEffect(() => {
    const t = setTimeout(() => loadProducts(), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId])

  const loadProducts = async () => {
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (categoryId) params.categoryId = categoryId
      const res = await api.get('/products', { params })
      setProducts(res.data)
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories')
      setCategories(res.data)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  // Abrir el detalle al hacer clic en la fila, sin pisar los enlaces de adentro
  const openProduct = (event, id) => {
    if (event.target.closest('a, button')) return
    navigate(`/products/${id}`)
  }

  const lowCount = products.filter(isLow).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          {lowCount > 0 && (
            <p className="page-sub">
              <strong>{lowCount}</strong> {lowCount === 1 ? 'producto bajo' : 'productos bajo'} el stock mínimo
            </p>
          )}
        </div>
        {!isGuest && (
          <Link to="/products/new" className="btn btn-primary header-action">
            <Icon name="plus" size={16} />
            Nuevo producto
          </Link>
        )}
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          aria-label="Buscar productos"
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">Cargando productos...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <p>{search || categoryId ? 'Ningún producto coincide con la búsqueda.' : 'Sin productos aún.'}</p>
            {!isGuest && !search && !categoryId && (
              <Link to="/products/new" className="btn btn-primary">
                <Icon name="plus" size={16} />
                Crear producto
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrap responsive-table">
            <table>
              <caption className="sr-only">Productos registrados y su estado de inventario</caption>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="num">Precio</th>
                  <th className="num">Stock</th>
                  <th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="product-row" onClick={(e) => openProduct(e, p.id)}>
                    <td data-label="Producto">
                      <Link to={`/products/${p.id}`} className="product-link">{p.name}</Link>
                    </td>
                    <td className="muted" data-label="Categoría">{p.category?.name || '—'}</td>
                    <td className="num" data-label="Precio">{money(p.price)}</td>
                    <td className="num" data-label="Stock">
                      <span className={`stock-tag ${isLow(p) ? 'low' : ''}`} title={`Stock mínimo: ${num(p.minStock)}`}>
                        {num(p.stock)}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className="row-actions">
                        {!isGuest && (
                          <Link
                            to={`/products/${p.id}/edit`}
                            className="icon-btn"
                            aria-label={`Editar ${p.name}`}
                            title="Editar"
                          >
                            <Icon name="edit" size={15} />
                          </Link>
                        )}
                        <Link
                          to={`/products/${p.id}`}
                          className="icon-btn"
                          aria-label={`Ver detalle de ${p.name}`}
                          title="Ver detalle"
                        >
                          <Icon name="chevron-right" size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isGuest && (
        <Link to="/products/new" className="fab" aria-label="Nuevo producto" title="Nuevo producto">
          <Icon name="plus" size={24} />
        </Link>
      )}
    </div>
  )
}

export default Products
