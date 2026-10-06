import { useState, useEffect } from 'react'
import api, { apiError } from '../services/api'
import { money, num, fmtDate, getTodayStr } from '../utils/format'
import { useToast } from '../components/Toaster'
import { useAuth } from '../context/AuthContext'

function Caja() {
  const toast = useToast()
  const { isGuest } = useAuth()
  const [summary, setSummary] = useState(null)
  const [from, setFrom] = useState(getTodayStr)
  const [to, setTo] = useState(getTodayStr)
  const [error, setError] = useState(null)
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '' })

  useEffect(() => {
    loadCaja()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  const loadCaja = async () => {
    try {
      const params = {}
      if (from) {
        // Inicio del día local (00:00:00)
        params.from = new Date(`${from}T00:00:00`).toISOString()
      }
      if (to) {
        // Final del día local (23:59:59.999)
        params.to = new Date(`${to}T23:59:59.999`).toISOString()
      }
      const res = await api.get('/caja/summary', { params })
      setSummary(res.data)
      setError(null)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/caja/expenses', {
        description: expenseForm.description.trim(),
        amount: num(expenseForm.amount)
      })
      toast('Gasto registrado')
      setExpenseForm({ description: '', amount: '' })
      loadCaja()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!confirm('Eliminar gasto?')) return
    try {
      await api.delete(`/caja/expenses/${id}`)
      toast('Gasto eliminado')
      loadCaja()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Caja</h1>
      </div>

      <div className="date-filters">
        <div className="form-group">
          <label>Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            const today = getTodayStr()
            setFrom(today)
            setTo(today)
          }}
        >
          Hoy
        </button>
        {(from || to) && (
          <button type="button" className="btn btn-ghost" onClick={() => { setFrom(''); setTo('') }}>
            Todo el período
          </button>
        )}
      </div>

      {error && (
        <div className="error-card" role="alert">
          No se pudo cargar el resumen de caja: {error}
        </div>
      )}

      {error ? null : !summary ? (
        <div className="loading-state">Cargando caja...</div>
      ) : (
        <>
          <div className="ledger">
            <div className="ledger-cell">
              <div className="ledger-label">Ventas</div>
              <div className="ledger-value">{money(summary.totalSales)}</div>
            </div>
            <div className="ledger-cell">
              <div className="ledger-label">Ganancias</div>
              <div className="ledger-value">{money(summary.totalProfit)}</div>
            </div>
            <div className="ledger-cell">
              <div className="ledger-label">Gastos</div>
              <div className="ledger-value">{money(summary.totalExpenses)}</div>
            </div>
            <div className="ledger-cell balance">
              <div className="ledger-label">Balance neto</div>
              <div className="ledger-value">{money(summary.netBalance)}</div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Agregar gasto</h3>
            <form onSubmit={handleExpenseSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Descripción</label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={isGuest}>Agregar gasto</button>
            </form>
          </div>

          <div className="card">
            <h3 className="card-title">Detalle de ventas</h3>
            {summary.sales?.length === 0 ? (
              <div className="empty-state"><p>Sin ventas{from || to ? ' en el período seleccionado' : ''}.</p></div>
            ) : (
              <div className="table-wrap responsive-table">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="num">Cantidad</th>
                      <th className="num">Venta</th>
                      <th className="num">Costo</th>
                      <th className="num">Ganancia</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.sales.map((s) => (
                      <tr key={s.id}>
                        <td data-label="Producto">{s.productName || '-'}</td>
                        <td className="num" data-label="Cantidad">{s.quantity}</td>
                        <td className="num" data-label="Venta">{money(s.total)}</td>
                        <td className="num" data-label="Costo">{money(num(s.costPrice) * num(s.quantity))}</td>
                        <td className={`num ${s.profit >= 0 ? 'profit-pos' : 'profit-neg'}`} data-label="Ganancia">{money(s.profit)}</td>
                        <td className="mono" data-label="Fecha">{fmtDate(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Gastos</h3>
            {summary.expenses?.length === 0 ? (
              <div className="empty-state"><p>Sin gastos{from || to ? ' en el período seleccionado' : ''}.</p></div>
            ) : (
              <div className="table-wrap responsive-table">
                <table>
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th className="num">Monto</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.expenses.map((e) => (
                      <tr key={e.id}>
                        <td data-label="Descripción">{e.description}</td>
                        <td className="num" data-label="Monto">{money(e.amount)}</td>
                        <td className="mono" data-label="Fecha">{fmtDate(e.createdAt)}</td>
                        <td data-label="Acciones">
                          <button className="btn btn-danger btn-small" onClick={() => handleDeleteExpense(e.id)} disabled={isGuest}>
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Caja
