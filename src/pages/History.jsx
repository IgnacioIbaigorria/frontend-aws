import { useState, useEffect } from 'react'
import api, { apiError } from '../services/api'
import { fmtDate } from '../utils/format'
import { useToast } from '../components/Toaster'

const FIELD_OPTIONS = [
  { value: '', label: 'Todos los campos' },
  { value: 'stock', label: 'Stock' },
  { value: 'price', label: 'Precio de venta' },
  { value: 'costPrice', label: 'Precio de costo' },
  { value: 'minStock', label: 'Stock mínimo' },
  { value: 'name', label: 'Nombre' },
  { value: 'description', label: 'Descripción' }
]

function History() {
  const toast = useToast()
  const [history, setHistory] = useState([])
  const [field, setField] = useState('')

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field])

  const loadHistory = async () => {
    try {
      const params = {}
      if (field) params.field = field
      const res = await api.get('/history', { params })
      setHistory(res.data)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Historial de cambios</h1>
      </div>

      <div className="filter-bar">
        <select value={field} onChange={(e) => setField(e.target.value)} aria-label="Filtrar por campo" style={{ width: 230 }}>
          {FIELD_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {history.length === 0 ? (
          <div className="empty-state"><p>Sin movimientos registrados.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Campo</th>
                  <th>Valor anterior</th>
                  <th>Nuevo valor</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.product?.name || '-'}</td>
                    <td className="mono">{h.field}</td>
                    <td className="muted">{h.oldValue ?? '-'}</td>
                    <td>{h.newValue ?? '-'}</td>
                    <td className="mono">{fmtDate(h.createdAt)}</td>
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

export default History
