import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { apiError } from '../services/api'
import { money, num, fmtDate } from '../utils/format'
import { useToast } from '../components/Toaster'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

function ProductDetail() {
  const { id } = useParams()
  const toast = useToast()
  const navigate = useNavigate()
  const { isGuest } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await api.get(`/products/${id}`)
        if (active) {
          setProduct(res.data)
          setError(null)
        }
      } catch (err) {
        if (active) setError(apiError(err))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id])

  const handleDelete = async () => {
    if (!confirm(`Eliminar "${product.name}"?`)) return
    try {
      await api.delete(`/products/${id}`)
      toast('Producto eliminado')
      navigate('/products')
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  if (loading) {
    return <div className="loading-state">Cargando producto...</div>
  }

  if (error || !product) {
    return (
      <div>
        <Link to="/products" className="back-link">
          <Icon name="arrow-left" size={14} />
          Productos
        </Link>
        <div className="error-card" role="alert">No se pudo cargar el producto: {error}</div>
      </div>
    )
  }

  const price = num(product.price)
  const costPrice = num(product.costPrice)
  const margin = costPrice > 0 ? ((price - costPrice) / costPrice) * 100 : 0
  const low = num(product.stock) <= num(product.minStock)

  return (
    <div>
      <Link to="/products" className="back-link">
        <Icon name="arrow-left" size={14} />
        Productos
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{product.name}</h1>
          {product.category && <p className="page-sub">{product.category.name}</p>}
        </div>
        <div className="page-header-actions">
          {!isGuest && (
            <>
              <Link to={`/products/${id}/edit`} className="btn btn-primary">
                <Icon name="edit" size={15} />
                Editar
              </Link>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                <Icon name="trash" size={15} />
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Detalles</h3>
        <dl className="detail-grid">
          <div className="detail-item">
            <dt>Precio de venta</dt>
            <dd className="detail-strong">{money(price)}</dd>
          </div>
          <div className="detail-item">
            <dt>Precio de costo</dt>
            <dd>{money(costPrice)}</dd>
          </div>
          <div className="detail-item">
            <dt>Margen</dt>
            <dd style={{ color: margin >= 0 ? 'var(--success)' : 'var(--brick)' }}>
              {margin.toFixed(1)}%
            </dd>
          </div>
          <div className="detail-item">
            <dt>Stock</dt>
            <dd>
              <span className={`stock-tag stock-tag-lg ${low ? 'low' : ''}`}>
                {num(product.stock)} unidades
              </span>
              <span className="field-help"> Mínimo: {num(product.minStock)}</span>
            </dd>
          </div>
          <div className="detail-item span-2">
            <dt>Descripción</dt>
            <dd>{product.description || '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>Etiquetas</dt>
            <dd>
              {product.tags?.length
                ? product.tags.map((t) => <span key={t.id} className="tag-pill">{t.name}</span>)
                : '—'}
            </dd>
          </div>
          <div className="detail-item">
            <dt>Creado</dt>
            <dd className="muted">{fmtDate(product.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default ProductDetail
