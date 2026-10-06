# Gestión de Stock — Frontend

Aplicación web para administrar productos, ventas, caja e inventario desde un único panel. El frontend está publicado y se puede probar en:

**[Abrir la aplicación en producción](https://d1hjojyfabiyi5.cloudfront.net/)**

Código fuente de este frontend:

**[IgnacioIbaigorria/frontend-aws](https://github.com/IgnacioIbaigorria/frontend-aws)**

El backend que provee la API vive en un repositorio separado:

**[Ver backend NestJS](https://github.com/IgnacioIbaigorria/backend_NestJS)**

## ¿Qué problema resuelve?

La aplicación centraliza tareas que normalmente se llevan en planillas o registros separados:

- Mantener actualizado el catálogo de productos.
- Consultar precios, costos, stock mínimo y disponibilidad.
- Registrar ventas con uno o varios medios de pago.
- Detectar productos con stock bajo y registrar reposiciones.
- Administrar categorías y etiquetas.
- Consultar movimientos históricos de productos.
- Revisar ventas, gastos, ganancias y balance neto de caja por período.

El objetivo es ofrecer una herramienta simple para pequeños comercios o emprendimientos que necesitan una vista operativa del inventario sin depender de procesos manuales.

## Funcionalidades

- **Productos:** alta, edición, eliminación, búsqueda y filtro por categoría.
- **Inventario:** stock actual, stock mínimo, margen y alertas de bajo stock.
- **Ventas:** búsqueda de productos, cantidades, pagos divididos y validación del total cobrado.
- **Caja:** resumen de ventas, ganancias, gastos y balance neto.
- **Reposición:** registro de cantidades, proveedores y costos.
- **Categorías y etiquetas:** organización del catálogo.
- **Historial:** seguimiento de cambios realizados sobre los productos.
- **Usuarios y roles:** alta, edición, reseteo de contraseña y asignación de permisos (solo ADMIN).
- **Acceso por roles:** navegación y acciones filtradas según el rol del usuario.
- **Diseño responsive:** navegación y tablas adaptadas a pantallas móviles.

## Stack tecnológico

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- [React Router 6](https://reactrouter.com/)
- [Axios](https://axios-http.com/)
- AWS S3
- AWS CloudFront
- GitHub Actions

El proyecto usa JavaScript y JSX, sin TypeScript.

## Arquitectura

```text
┌─────────────────────┐
│        Usuario      │
│   navegador web     │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│      CloudFront     │
│  CDN + distribución │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│         S3          │
│  archivos estáticos │
│    React + Vite     │
└─────────────────────┘
           
┌─────────────────────┐
│ CloudFront /api     │
│ ruta hacia la API   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Backend NestJS      │
│ repositorio separado│
└─────────────────────┘
```

La aplicación se compila como una SPA estática. Vite genera los archivos finales en `dist/`, que se publican en S3 y se distribuyen mediante CloudFront.

Las llamadas HTTP del frontend se centralizan en `src/services/api.js` y utilizan la ruta base `/api`. En desarrollo, Vite puede redirigir esa ruta al backend local en `http://localhost:3000`. En producción, la distribución debe enrutar `/api` hacia el backend desplegado.

## Autenticación

La aplicación usa el flujo BFF de Cognito implementado por el backend:

- `POST /auth/login` recibe `username` y `password`; devuelve el access token y setea el refresh token en una cookie `HttpOnly; SameSite=Strict`.
- `POST /auth/refresh` renueva el access token: el refresh token lo aporta la cookie, el body solo envía `username`.
- `POST /auth/logout` elimina la cookie de refresh en el servidor.
- Las demás requests envían el `accessToken` como `Authorization: Bearer <token>`.

El access token (1 h) se mantiene solo en memoria y el refresh token vive únicamente en la cookie `HttpOnly`: el JavaScript del navegador nunca puede leerla, por lo que un XSS no puede robar la sesión persistente. `localStorage` guarda solamente el `username` (no es secreto). Cookie y API comparten origen (CloudFront `/api` en producción, proxy de Vite en desarrollo), así que la sesión sobrevive al cierre del navegador: al reabrirla se renueva el access token con la cookie guardada. Si la sesión se cierra en una pestaña, las demás pestañas también salen (evento `storage`). Ante un `401`, el cliente intenta renovar la sesión una sola vez y, si falla, limpia la sesión y devuelve al usuario al login. La autenticación de la interfaz no reemplaza la autorización del backend: los roles y permisos siguen siendo responsabilidad de los guards de NestJS.

El backend debe dejar públicos `/auth/login` y `/auth/refresh`; si el guard JWT global protege también esas rutas, ningún usuario puede iniciar o renovar una sesión.

Para conocer la implementación de la API, los modelos, endpoints, base de datos y despliegue del servidor, consultá el [repositorio del backend NestJS](https://github.com/IgnacioIbaigorria/backend_NestJS).

## Roles y permisos

La aplicación controla el acceso por roles (grupos de Cognito) en dos capas:

1. **Backend (fuente de verdad):** cada endpoint lleva `@Roles(...)` y el `RolesGuard` responde `403` si el JWT no contiene el grupo requerido.
2. **Frontend (UX):** la navegación y las rutas se filtran según el rol, y los botones de escritura quedan deshabilitados para el rol invitado.

| Módulo | ADMIN | MANAGER | INVENTORY_MANAGER | SELLER | GUEST |
|---|:---:|:---:|:---:|:---:|:---:|
| Productos | CRUD | CRUD | CRUD | Lectura | Lectura |
| Ventas | CRUD | CRUD | Lectura | Crear + Lectura | Lectura |
| Categorías | CRUD | CRUD | Lectura | Lectura | Lectura |
| Etiquetas | CRUD | CRUD | Lectura | Lectura | Lectura |
| Reposición | CRUD | CRUD | CRUD | — | Lectura |
| Historial | Lectura | Lectura | Lectura | — | Lectura |
| Caja | CRUD | CRUD | — | — | Lectura |
| Usuarios | CRUD | — | — | — | — |

El rol se infiere del JWT (`cognito:groups`). Después de cambiar los permisos de un usuario hay que cerrar sesión y volver a entrar para que el token nuevo refleje los grupos.

## Usuario invitado (modo prueba)

Para probar el sistema sin crear usuarios nuevos existe un usuario invitado ya creado en Cognito:

| Campo | Valor |
|---|---|
| Usuario | `Invitado` |
| Contraseña | `Invitado1.` |

El rol `GUEST` es de **solo lectura**: puede consultar productos, ventas, caja, reposiciones, categorías, etiquetas e historial, pero no puede crear, editar ni eliminar nada. Esa restricción está aplicada en el backend (guards de roles de NestJS), no solo oculta en la interfaz, así que el invitado no puede modificar datos aunque intente llamar a la API directamente.

Consideraciones de seguridad:

- Las credenciales son públicas a propósito: cualquier persona con acceso a este repositorio o a la aplicación puede iniciar sesión con ese usuario.
- El invitado **sí ve datos sensibles**: ventas, ingresos, gastos y balance de caja. Si la instancia contiene datos reales de un comercio, conviene deshabilitar al usuario `Invitado` (o rotarle la contraseña) cuando no se lo esté usando para pruebas.
- La contraseña del invitado no da acceso a administración de usuarios ni a escritura sobre el catálogo: esos endpoints exigen rol `ADMIN` o roles con permiso de escritura.

## Estructura principal

```text
.
├── .github/
│   └── workflows/
│       └── deploy.yml       # Build y despliegue automático
├── src/
│   ├── components/          # Componentes compartidos
│   ├── context/             # Contexto de autenticación (roles, sesión)
│   ├── pages/               # Pantallas de la aplicación
│   ├── services/            # Cliente HTTP y servicios
│   ├── utils/               # Utilidades de formato y etiquetas de roles
│   ├── App.jsx              # Rutas y layout principal
│   ├── main.jsx             # Punto de entrada
│   └── index.css            # Sistema visual y responsive
├── index.html
├── vite.config.js
├── package.json
└── yarn.lock
```

## Ejecutar localmente

### Requisitos

- Node.js
- Yarn
- Backend NestJS ejecutándose localmente en el puerto `3000`, o una API accesible mediante la ruta configurada

### Instalación

```bash
yarn install --frozen-lockfile
```

### Desarrollo

```bash
yarn dev
```

La aplicación estará disponible en:

```text
http://localhost:3001
```

Durante el desarrollo, Vite configura el proxy `/api` hacia:

```text
http://localhost:3000
```

### Compilar para producción

```bash
yarn build
```

El resultado se genera en `dist/`.

### Previsualizar el build

```bash
yarn preview
```

## Despliegue

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) automatiza el proceso:

1. Instala las dependencias con `yarn install --frozen-lockfile`.
2. Ejecuta `yarn build`.
3. Guarda `dist/` como artifact.
4. En pushes a `main`, sincroniza el artifact con S3.
5. Invalida la caché de CloudFront cuando está configurado `CLOUDFRONT_ID`.

El despliegue de producción necesita estos secrets en GitHub Actions:

| Secret | Uso |
|---|---|
| `S3_BUCKET` | Bucket donde se publica `dist/` |
| `AWS_ROLE_ARN` | Rol IAM para autenticación OIDC, recomendado |
| `AWS_ACCESS_KEY_ID` | Alternativa a OIDC |
| `AWS_SECRET_ACCESS_KEY` | Alternativa a OIDC |
| `CLOUDFRONT_ID` | Distribución cuya caché se invalida |

Se recomienda utilizar OIDC con `AWS_ROLE_ARN` en lugar de almacenar claves AWS permanentes. La configuración detallada de AWS está documentada en [`FRONTEND_DEPLOY.md`](FRONTEND_DEPLOY.md).

## React Router y CloudFront

Como la aplicación utiliza `BrowserRouter`, las rutas internas deben devolver `index.html` para que React Router pueda resolverlas. La configuración de hosting debe contemplar el fallback de la SPA para rutas como:

```text
/products
/sales
/caja
/reposicion
/history
```

Sin ese fallback, la navegación puede funcionar desde la página inicial, pero una recarga directa en una ruta interna puede devolver `404`.

## Backend

Este repositorio contiene únicamente el cliente web. La API y la lógica del servidor están en:

**[IgnacioIbaigorria/backend_NestJS](https://github.com/IgnacioIbaigorria/backend_NestJS)**

Ese repositorio debe consultarse para:

- Endpoints disponibles.
- Entidades y relaciones.
- Reglas de negocio.
- Persistencia y base de datos.
- Configuración de CORS.
- Despliegue del backend.

## Estado del proyecto

- Frontend desplegado en AWS CloudFront.
- Archivos estáticos almacenados en AWS S3.
- Deploy automatizado con GitHub Actions.
- Backend mantenido en un repositorio NestJS independiente.
