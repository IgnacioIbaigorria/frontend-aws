import { useState, useEffect } from 'react'
import api, { apiError } from '../services/api'
import { money, num, fmtDate } from '../utils/format'
import { useToast } from '../components/Toaster'

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

const isLow = (p) => num(p.stock) <= num(p.minStock)

function Products() {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    loadCategories()
    loadTags()
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

  const loadTags = async () => {
    try {
      const res = await api.get('/tags')
      setTags(res.data)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

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
      if (editing) {
        await api.patch(`/products/${editing}`, payload)
        toast('Producto actualizado')
      } else {
        await api.post('/products', payload)
        toast('Producto creado')
      }
      setForm(emptyForm())
      setEditing(null)
      loadProducts()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const handleEdit = (product) => {
    setEditing(product.id)
    setForm({
      name: product.name,
      description: product.description || '',
      costPrice: product.costPrice ?? '',
      price: product.price ?? '',
      stock: product.stock ?? '',
      minStock: product.minStock ?? '5',
      categoryId: product.categoryId || '',
      tagIds: product.tags?.map((t) => t.id) || []
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar producto?')) return
    try {
      await api.delete(`/products/${id}`)
      toast('Producto eliminado')
      loadProducts()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const lowCount = products.filter(isLow).length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Productos</h1>
        {lowCount > 0 && (
          <p className="page-sub">
            <strong>{lowCount}</strong> {lowCount === 1 ? 'producto' : 'productos'} bajo el stock mínimo
          </p>
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
        <h3 className="card-title">{editing ? 'Editar producto' : 'Crear producto'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group span-2">
              <label htmlFor="product-name">Nombre</label>
              <input id="product-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group span-2">
              <label htmlFor="product-description">Descripción</label>
              <input id="product-description" type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="product-cost">Precio de costo</label>
              <input id="product-cost" type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
              <span className="field-help">Lo que pagás al proveedor.</span>
            </div>
            <div className="form-group">
              <label htmlFor="product-price">Precio de venta</label>
              <input id="product-price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              <span className="field-help">El importe que verá tu cliente.</span>
            </div>
            <div className="form-group">
              <label htmlFor="product-stock">Stock actual</label>
              <input id="product-stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="product-min-stock">Stock mínimo</label>
              <input id="product-min-stock" type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="product-category">Categoría</label>
              <select id="product-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="product-tags">Etiquetas</label>
              <select id="product-tags" multiple value={form.tagIds} onChange={(e) => setForm({ ...form, tagIds: Array.from(e.target.selectedOptions, (o) => o.value) })}>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <span className="field-help">Usá Ctrl/Cmd para elegir varias.</span>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{editing ? 'Guardar cambios' : 'Crear producto'}</button>
            {editing && (
              <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(emptyForm()) }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="card-title">Lista de productos</h3>
        {loading ? (
          <div className="loading-state">Cargando productos...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <p>{search || categoryId ? 'Ningún producto coincide con la búsqueda.' : 'Sin productos aún.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Productos registrados y su estado de inventario</caption>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th className="num">Precio costo</th>
                  <th className="num">Precio venta</th>
                  <th className="num">Margen</th>
                  <th className="num">Stock</th>
                  <th>Categoría</th>
                  <th>Etiquetas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const price = num(p.price)
                  const costPrice = num(p.costPrice)
                  const margin = costPrice > 0 ? ((price - costPrice) / costPrice) * 100 : 0
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="product-name">{p.name}</div>
                        {p.description && <div className="product-meta">{p.description}</div>}
                      </td>
                      <td className="num">{money(costPrice)}</td>
                      <td className="num">{money(price)}</td>
                      <td className="num" style={{ color: margin >= 0 ? 'var(--success)' : 'var(--brick)' }}>
                        {margin.toFixed(1)}%
                      </td>
                      <td className="num">
                        <span className={`stock-tag ${isLow(p) ? 'low' : ''}`} title={`Stock mínimo: ${num(p.minStock)}`}>
                          {num(p.stock)}
                        </span>
                      </td>
                      <td className="muted">{p.category?.name || '-'}</td>
                      <td className="muted">{p.tags?.map((t) => t.name).join(', ') || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button className="btn btn-ghost btn-small" onClick={() => handleEdit(p)} aria-label={`Editar ${p.name}`}>Editar</button>
                          <button className="btn btn-danger btn-small" onClick={() => handleDelete(p.id)} aria-label={`Eliminar ${p.name}`}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Products
