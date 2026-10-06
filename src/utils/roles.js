// Etiquetas de los grupos de Cognito (COGNITO_ROLES en el backend).
// Orden igual al del backend para que los selectores queden consistentes.
export const ROLE_LABELS = {
  ADMIN: 'Administrador',
  MANAGER: 'Manager',
  SELLER: 'Vendedor',
  INVENTORY_MANAGER: 'Encargado de inventario',
  AUDITOR: 'Auditor',
  GUEST: 'Invitado (solo lectura)'
}

export const roleLabel = (role) => ROLE_LABELS[role] || role

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({
  value,
  label
}))
