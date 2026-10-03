import { useState, useEffect } from 'react'
import api, { apiError } from '../services/api'
import { useToast } from '../components/Toaster'

function Tags() {
  const toast = useToast()
  const [tags, setTags] = useState([])
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')

  useEffect(() => {
    loadTags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    try {
      if (editing) {
        await api.patch(`/tags/${editing}`, { name: name.trim() })
        toast('Etiqueta actualizada')
      } else {
        await api.post('/tags', { name: name.trim() })
        toast('Etiqueta creada')
      }
      setName('')
      setEditing(null)
      loadTags()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const handleEdit = (t) => {
    setEditing(t.id)
    setName(t.name)
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar etiqueta?')) return
    try {
      await api.delete(`/tags/${id}`)
      toast('Etiqueta eliminada')
      loadTags()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Etiquetas</h1>
      </div>

      <div className="card">
        <h3 className="card-title">{editing ? 'Editar etiqueta' : 'Crear etiqueta'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">{editing ? 'Guardar cambios' : 'Crear etiqueta'}</button>
            {editing && (
              <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setName('') }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="card-title">Lista de etiquetas</h3>
        {tags.length === 0 ? (
          <div className="empty-state"><p>Sin etiquetas aún.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((t) => (
                  <tr key={t.id}>
                    <td className="product-name">{t.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-ghost btn-small" onClick={() => handleEdit(t)}>Editar</button>
                        <button className="btn btn-danger btn-small" onClick={() => handleDelete(t.id)}>Eliminar</button>
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

export default Tags
