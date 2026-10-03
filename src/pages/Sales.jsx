import { useState, useEffect } from 'react'
import api, { apiError } from '../services/api'
import { money, num, fmtDate } from '../utils/format'
import { useToast } from '../components/Toaster'

function Sales() {
  const toast = useToast()
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [payments, setPayments] = useState([{ amount: '', paymentMethod: 'efectivo' }])

  useEffect(() => {
    loadSales()
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Búsqueda de productos en el backend (parámetro search), con debounce
  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/products', { params: { search: search.trim() } })
        setResults(res.data)
      } catch (err) {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const loadSales = async () => {
    try {
      const res = await api.get('/sales')
      setSales(res.data)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const loadProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  // El backend exige que la suma de pagos coincida exactamente con el total
  const total = selected ? num(selected.price) * num(quantity) : 0
  const paid = payments.reduce((sum, p) => sum + num(p.amount), 0)
  const remaining = total - paid
  const isBalanced = Math.abs(remaining) <= 0.001

  const selectProduct = (p) => {
    setSelected(p)
    setSearch(p.name)
    setResults([])
  }

  const addPayment = () => {
    setPayments([...payments, { amount: '', paymentMethod: 'efectivo' }])
  }

  const removePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index))
  }

  const updatePayment = (index, field, value) => {
    const next = [...payments]
    next[index] = { ...next[index], [field]: value }
    setPayments(next)
  }

  // Completa el último pago con lo que falta para cuadrar
  const completePayment = () => {
    setPayments((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      next[next.length - 1] = { ...next[next.length - 1], amount: Math.max(remaining, 0).toFixed(2) }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) {
      toast('Selecciona un producto', 'error')
      return
    }
    if (!isBalanced) {
      toast(
        remaining > 0
          ? `Los pagos deben sumar ${money(total)} — faltan ${money(remaining)}`
          : `Los pagos deben sumar ${money(total)} — sobran ${money(-remaining)}`,
        'error'
      )
      return
    }

    const payload = { productId: selected.id, quantity: num(quantity) }
    const validPayments = payments
      .filter((p) => num(p.amount) > 0)
      .map((p) => ({ amount: num(p.amount), paymentMethod: p.paymentMethod }))
    if (validPayments.length) payload.payments = validPayments

    try {
      await api.post('/sales', payload)
      toast(`Venta registrada — ${money(total)}`)
      setSearch('')
      setSelected(null)
      setResults([])
      setQuantity(1)
      setPayments([{ amount: '', paymentMethod: 'efectivo' }])
      loadSales()
      loadProducts()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ventas</h1>
      </div>

      <div className="card">
        <h3 className="card-title">Registrar venta</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group search-container">
            <label>Producto</label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null) }}
              placeholder="Escribe para buscar..."
              autoComplete="off"
              required
            />
            {results.length > 0 && !selected && (
              <div className="product-results">
                {results.map((p) => (
                  <div key={p.id} className="product-result-item" onClick={() => selectProduct(p)}>
                    <div className="product-name">{p.name}</div>
                    <div className="product-meta">
                      {money(p.price)} · stock {num(p.stock)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selected && (
              <div className="product-meta" style={{ marginTop: '0.375rem' }}>
                Seleccionado: <strong>{selected.name}</strong> — {money(selected.price)} · stock {num(selected.stock)}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Cantidad</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Pagos</label>
            {payments.map((payment, index) => (
              <div key={index} className="payment-row">
                <select
                  value={payment.paymentMethod}
                  onChange={(e) => updatePayment(index, 'paymentMethod', e.target.value)}
                  aria-label="Método de pago"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="qr">QR</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="credito">Crédito</option>
                  <option value="debito">Débito</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Monto"
                  value={payment.amount}
                  onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                  aria-label="Monto del pago"
                />
                <button type="button" className="btn-remove" onClick={() => removePayment(index)} aria-label="Quitar pago">
                  ×
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn-add-payment" onClick={addPayment}>
                + Agregar otro pago
              </button>
              {!isBalanced && remaining > 0 && (
                <button type="button" className="btn-add-payment" onClick={completePayment}>
                  Completar {money(remaining)}
                </button>
              )}
            </div>
            <div className="payment-total">
              <span>Total: <strong>{money(total)}</strong></span>
              <span>Pagado: <strong>{money(paid)}</strong></span>
              <span className={`remaining ${isBalanced ? 'ok' : 'bad'}`}>
                {isBalanced ? 'Completo' : remaining > 0 ? `Faltan ${money(remaining)}` : `Sobran ${money(-remaining)}`}
              </span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">Vender</button>
        </form>
      </div>

      <div className="card">
        <h3 className="card-title">Historial de ventas</h3>
        {sales.length === 0 ? (
          <div className="empty-state"><p>Sin ventas registradas.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Cantidad</th>
                  <th className="num">Precio unit.</th>
                  <th className="num">Total</th>
                  <th>Pagos</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.product?.name || '-'}</td>
                    <td className="num">{s.quantity}</td>
                    <td className="num">{money(s.unitPrice)}</td>
                    <td className="num">{money(s.total)}</td>
                    <td className="muted">
                      {s.payments?.map((p) => `${p.paymentMethod}: ${money(p.amount)}`).join(', ') || '-'}
                    </td>
                    <td className="mono">{fmtDate(s.createdAt)}</td>
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

export default Sales
