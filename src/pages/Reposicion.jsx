import { useState, useEffect } from 'react'
import api, { apiError } from '../services/api'
import { money, num, fmtDate } from '../utils/format'
import { useToast } from '../components/Toaster'

function Reposicion() {
  const toast = useToast()
  const [reposiciones, setReposiciones] = useState([])
  const [products, setProducts] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [form, setForm] = useState({ productId: '', quantity: '', supplier: '', cost: '' })

  useEffect(() => {
    loadReposicion()
    loadProducts()
    loadLowStock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadReposicion = async () => {
    try {
      const res = await api.get('/reposicion')
      setReposiciones(res.data)
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

  const loadLowStock = async () => {
    try {
      const res = await api.get('/products/low-stock')
      setLowStock(res.data)
    } catch (err) {
      // La sección de stock bajo es secundaria; no interrumpe la página
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      productId: form.productId,
      quantity: num(form.quantity)
    }
    if (form.supplier.trim()) payload.supplier = form.supplier.trim()
    if (form.cost !== '') payload.cost = num(form.cost)

    try {
      await api.post('/reposicion', payload)
      toast('Reposición registrada')
      setForm({ productId: '', quantity: '', supplier: '', cost: '' })
      loadReposicion()
      loadProducts()
      loadLowStock()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const prefill = (p) => {
    setForm((f) => ({ ...f, productId: p.id }))
    document.getElementById('reposicion-quantity')?.focus()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reposición</h1>
      </div>

      {lowStock.length > 0 && (
        <section className="lowstock">
          <h3 className="lowstock-title">Stock bajo el mínimo</h3>
          {lowStock.map((p) => (
            <div key={p.id} className="lowstock-item">
              <div>
                <div className="product-name">{p.name}</div>
                <div className="product-meta">
                  Stock {num(p.stock)} · mínimo {num(p.minStock)}
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-small" onClick={() => prefill(p)}>
                Reponer
              </button>
            </div>
          ))}
        </section>
      )}

      <div className="card">
        <h3 className="card-title">Registrar reposición</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Producto</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                required
              >
                <option value="">Selecciona un producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (stock: {num(p.stock)})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad</label>
              <input
                id="reposicion-quantity"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Proveedor</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Costo total</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Registrar reposición</button>
        </form>
      </div>

      <div className="card">
        <h3 className="card-title">Historial de reposiciones</h3>
        {reposiciones.length === 0 ? (
          <div className="empty-state"><p>Sin reposiciones registradas.</p></div>
        ) : (
          <div className="table-wrap responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Cantidad</th>
                  <th>Proveedor</th>
                  <th className="num">Costo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {reposiciones.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Producto">{r.product?.name || '-'}</td>
                    <td className="num" data-label="Cantidad">{r.quantity}</td>
                    <td className="muted" data-label="Proveedor">{r.supplier || '-'}</td>
                    <td className="num" data-label="Costo">{r.cost ? money(r.cost) : '-'}</td>
                    <td className="mono" data-label="Fecha">{fmtDate(r.createdAt)}</td>
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

export default Reposicion
