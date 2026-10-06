import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { apiError } from '../services/api'
import { num } from '../utils/format'
import { useToast } from '../components/Toaster'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const emptyForm = () => ({
  name: '',
  description: '',
  costPrice: '',
  price: '',
  stock: '',
  minStock: '5',
  categoryId: '',
  tagIds: []
})

function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const toast = useToast()
  const navigate = useNavigate()
  const { isGuest } = useAuth()
  const [form, setForm] = useState(emptyForm())
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([
          api.get('/categories'),
          api.get('/tags')
        ])
        setCategories(catRes.data)
        setTags(tagRes.data)
      } catch (err) {
        toast(apiError(err), 'error')
      }
    }
    loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isEdit) return
    let active = true
    const loadProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`)
        if (!active) return
        const p = res.data
        setForm({
          name: p.name,
          description: p.description || '',
          costPrice: p.costPrice ?? '',
          price: p.price ?? '',
          stock: p.stock ?? '',
          minStock: p.minStock ?? '5',
          categoryId: p.categoryId || '',
          tagIds: p.tags?.map((t) => t.id) || []
        })
      } catch (err) {
        if (active) setLoadError(apiError(err))
      } finally {
        if (active) setLoading(false)
      }
    }
    loadProduct()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: num(form.price),
      stock: num(form.stock),
      minStock: num(form.minStock)
    }
    if (form.costPrice !== '') payload.costPrice = num(form.costPrice)
    if (form.categoryId) payload.categoryId = form.categoryId
    if (form.tagIds.length) payload.tagIds = form.tagIds

    try {
      if (isEdit) {
        await api.patch(`/products/${id}`, payload)
        toast('Producto actualizado')
        navigate(`/products/${id}`)
      } else {
        await api.post('/products', payload)
        toast('Producto creado')
        navigate('/products')
      }
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  if (loading) {
    return <div className="loading-state">Cargando producto...</div>
  }

  if (loadError) {
    return (
      <div>
        <Link to="/products" className="back-link">
          <Icon name="arrow-left" size={14} />
          Productos
        </Link>
        <div className="error-card" role="alert">No se pudo cargar el producto: {loadError}</div>
      </div>
    )
  }

  const cancelTo = isEdit ? `/products/${id}` : '/products'

  return (
    <div>
      <Link to={cancelTo} className="back-link">
        <Icon name="arrow-left" size={14} />
        {isEdit ? 'Volver al producto' : 'Productos'}
      </Link>

      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group span-2">
              <label htmlFor="product-name">Nombre</label>
              <input id="product-name" type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
            </div>
            <div className="form-group span-2">
              <label htmlFor="product-description">Descripción</label>
              <input id="product-description" type="text" value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="product-cost">Precio de costo</label>
              <input id="product-cost" type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setField('costPrice', e.target.value)} />
              <span className="field-help">Lo que pagás al proveedor.</span>
            </div>
            <div className="form-group">
              <label htmlFor="product-price">Precio de venta</label>
              <input id="product-price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setField('price', e.target.value)} required />
              <span className="field-help">El importe que verá tu cliente.</span>
            </div>
            <div className="form-group">
              <label htmlFor="product-stock">Stock actual</label>
              <input id="product-stock" type="number" min="0" value={form.stock} onChange={(e) => setField('stock', e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="product-min-stock">Stock mínimo</label>
              <input id="product-min-stock" type="number" min="0" value={form.minStock} onChange={(e) => setField('minStock', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="product-category">Categoría</label>
              <select id="product-category" value={form.categoryId} onChange={(e) => setField('categoryId', e.target.value)}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="product-tags">Etiquetas</label>
              <select id="product-tags" multiple value={form.tagIds} onChange={(e) => setField('tagIds', Array.from(e.target.selectedOptions, (o) => o.value))}>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <span className="field-help">Usá Ctrl/Cmd para elegir varias.</span>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isGuest}>
              {isEdit ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <Link to={cancelTo} className="btn btn-ghost">Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductForm
