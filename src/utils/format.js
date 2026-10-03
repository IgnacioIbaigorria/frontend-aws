/** Convierte a número seguro (el backend guarda Decimals como strings) */
export const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/** Formatea dinero: money(25) → "$25.00" */
export const money = (v) => `$${num(v).toFixed(2)}`

/** Fecha corta legible; tolera null/undefined */
export const fmtDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
