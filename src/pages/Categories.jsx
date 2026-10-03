import { useState, useEffect } from 'react'
import api, { apiError } from '../services/api'
import { fmtDate } from '../utils/format'
import { useToast } from '../components/Toaster'

function Categories() {
  const toast = useToast()
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })

  useEffect(() => {
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories')
      setCategories(res.data)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { name: form.name.trim(), description: form.description.trim() || null }
    try {
      if (editing) {
        await api.patch(`/categories/${editing}`, payload)
        toast('Categoría actualizada')
      } else {
        await api.post('/categories', payload)
        toast('Categoría creada')
      }
      setForm({ name: '', description: '' })
      setEditing(null)
      loadCategories()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const handleEdit = (c) => {
    setEditing(c.id)
    setForm({ name: c.name, description: c.description || '' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar categoría?')) return
    try {
      await api.delete(`/categories/${id}`)
      toast('Categoría eliminada')
      loadCategories()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Categorías</h1>
      </div>

      <div className="card">
        <h3 className="card-title">{editing ? 'Editar categoría' : 'Crear categoría'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">{editing ? 'Guardar cambios' : 'Crear categoría'}</button>
            {editing && (
              <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm({ name: '', description: '' }) }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="card-title">Lista de categorías</h3>
        {categories.length === 0 ? (
          <div className="empty-state"><p>Sin categorías aún.</p></div>
        ) : (
          <div className="table-wrap responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="product-name" data-label="Nombre">{c.name}</td>
                    <td className="muted" data-label="Descripción">{c.description || '-'}</td>
                    <td data-label="Acciones">
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-ghost btn-small" onClick={() => handleEdit(c)}>Editar</button>
                        <button className="btn btn-danger btn-small" onClick={() => handleDelete(c.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Categories
