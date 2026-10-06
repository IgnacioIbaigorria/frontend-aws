# Despliegue Frontend en S3 + CI/CD (GitHub Actions)

## Estado actual

- **Frontend**: React + Vite (este repo). Se instala con **yarn** (hay `yarn.lock`, no `package-lock.json`) y se compila con `yarn build` → genera la carpeta `dist/`.
- **Backend**: NestJS desplegado por separado en EC2.
- **API URL**: el frontend usa la ruta relativa `/api` en `src/services/api.js`. En desarrollo, Vite la proxifica a `http://localhost:3000`; en producción, CloudFront debe enrutar `/api/*` hacia el backend.

## Arquitectura

```
┌──────────────────┐
│  GitHub Actions  │  push a main → build → sync a S3
└────────┬─────────┘
         ▼
┌──────────────────┐        ┌──────────────────┐
│  CloudFront (CDN)│◀──────▶│  S3 (Frontend)   │
│  HTTPS + caché   │        │  React SPA       │
└────────┬─────────┘        └──────────────────┘
         │ `/api/*` → API origin
         ▼
┌──────────────────┐
│  EC2 (Backend)   │
│  NestJS :3000    │
└──────────────────┘
```

El navegador carga el SPA desde S3/CloudFront. Las peticiones `/api/*` deben tener un comportamiento específico en CloudFront que las envíe al backend. Así el navegador usa el mismo dominio HTTPS y no depende de una URL HTTP hardcodeada.

---

## Paso 1: Crear bucket S3

### En AWS Console

1. Ve a **S3** → **Create bucket**
2. Nombre: `stock-frontend-tu-nombre` (debe ser único global)
3. **Desactivar** "Block all public access"
4. Click **Create bucket**

### Configurar bucket para hosting estático

1. Selecciona tu bucket → **Properties**
2. **Static website hosting** → **Edit**
3. **Enable**
4. Index document: `index.html`
5. Error document: `index.html` (importante para que funcionen las rutas de react-router, ej: `/products`)
6. Click **Save changes**

### Configurar permisos

1. Selecciona tu bucket → **Permissions**
2. **Bucket policy** → **Edit**
3. Pega esto (cambia `tu-bucket` por el nombre de tu bucket):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tu-bucket/*"
    }
  ]
}
```

4. Click **Save changes**

---

## Paso 2: Crear credenciales AWS para GitHub Actions

### Opción A — Usuario IAM (rápida)

1. Ve a **IAM** → **Users** → **Add user**
2. Nombre: `github-deploy` → Access key → **Create user**
3. Pega esta policy inline (cambia `tu-bucket` y el ID de CloudFront si lo tienes):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::tu-bucket",
        "arn:aws:s3:::tu-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront:::distribution/TU_DISTRIBUTION_ID"
    }
  ]
}
```

4. Guarda y copia el **Access Key ID** y la **Secret Access Key**.

### Opción B — OIDC (recomendada, sin claves permanentes)

1. **IAM** → **Identity providers** → **Add provider**
   - Provider type: **OpenID Connect**
   - URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
2. Crea un **rol** para ese provider con esta trust policy (cambia `TU_ACCOUNT_ID` y `TU_USUARIO/TU_REPO`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::TU_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:TU_USUARIO/TU_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

3. Asigna al rol la misma policy del paso anterior y copia el **Role ARN**.

---

## Paso 3: Workflow de GitHub Actions (ya creado)

El archivo **`.github/workflows/deploy.yml`** ya existe en el repo. Hace:

- **Job `build`** (en cada push y PR a `main`): instala dependencias con `yarn install --frozen-lockfile`, compila con `yarn build` y sube el resultado como artifact.
- **Job `deploy`** (solo push a `main`): descarga el artifact, sincroniza `dist/` con S3 usando `--delete` (borra archivos viejos) e invalida CloudFront si existe el secreto.
- **Credenciales**: usa OIDC si existe el secreto `AWS_ROLE_ARN`; si no, usa las claves estáticas.

<details>
<summary>Ver contenido completo del workflow</summary>

```yaml
name: CI/CD - Frontend

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  id-token: write

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

env:
  AWS_REGION: us-east-1

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'yarn'
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      - name: Build
        run: yarn build
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: dist/
          retention-days: 1

  deploy:
    name: Deploy to S3
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    env:
      AWS_ROLE_ARN: ${{ secrets.AWS_ROLE_ARN }}
      CLOUDFRONT_ID: ${{ secrets.CLOUDFRONT_ID }}
    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: frontend-dist
          path: dist/
      - name: Configure AWS credentials (OIDC)
        if: env.AWS_ROLE_ARN != ''
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Configure AWS credentials (static keys)
        if: env.AWS_ROLE_ARN == ''
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      # index.html nunca debe cachearse: los bundles tienen hash y --delete los
      # reemplaza en cada deploy; un HTML cacheado apunta a assets que ya no
      # existen -> 404 en el navegador. Los assets con hash sí son inmutables.
      - name: Sync to S3
        run: |
          aws s3 sync dist/ "s3://${{ secrets.S3_BUCKET }}" --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html"
          aws s3 cp dist/index.html "s3://${{ secrets.S3_BUCKET }}/index.html" \
            --cache-control "no-cache" \
            --content-type "text/html"
      - name: Warn if CloudFront invalidation is not configured
        if: env.CLOUDFRONT_ID == ''
        run: echo "::warning::Secreto CLOUDFRONT_ID no definido: se omite la invalidacion de CloudFront y el HTML viejo puede servirse hasta 24 h."
      - name: Invalidate CloudFront cache
        if: env.CLOUDFRONT_ID != ''
        run: aws cloudfront create-invalidation --distribution-id "${{ secrets.CLOUDFRONT_ID }}" --paths "/*"
```

</details>

> **Nota**: la versión anterior del doc usaba `npm ci` y `frontend/build/` — esto **no funciona** aquí porque el proyecto usa yarn (sin `package-lock.json`) y Vite genera `dist/`. Ya está corregido.

---

## Paso 4: Configurar Secrets en GitHub

1. Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"** y agrega:

| Nombre | ¿Requerido? | Valor |
|--------|-------------|-------|
| `S3_BUCKET` | ✅ Sí | Nombre de tu bucket (ej: `stock-frontend-tu-nombre`) |
| `AWS_ACCESS_KEY_ID` | Si no usas OIDC | Access Key del usuario `github-deploy` |
| `AWS_SECRET_ACCESS_KEY` | Si no usas OIDC | Secret Access Key |
| `AWS_ROLE_ARN` | Opcional (OIDC) | ARN del rol IAM (si lo creaste) |
| `CLOUDFRONT_ID` | ✅ Sí (en producción) | ID de tu distribución CloudFront (ej: `E123ABC45XYZ`). **Sin este secreto el pipeline omite la invalidación** y CloudFront sirve el HTML anterior hasta 24 h después de cada deploy (assets viejos → 404). El workflow emite un warning si falta. |

---

## Paso 5: Crear distribución CloudFront (requerido en producción)

1. Ve a AWS Console → **CloudFront** → **Create distribution**
2. **Origin domain**: selecciona tu bucket S3
3. **Default root object**: `index.html`
4. **Viewer protocol policy**: Redirect HTTP to HTTPS
5. Click **Create distribution**
6. Espera ~15 min para que se despliegue
7. Copia el **Distribution domain name** (ej: `d1234.cloudfront.net`) y el **ID** para el secreto `CLOUDFRONT_ID`

---

## Paso 6: Verificar el backend en EC2 (ya desplegado)

El frontend usa `/api`, por lo que para que el frontend desplegado funcione, verifica:

1. **CloudFront**: debe existir un behavior `/api/*` antes del behavior por defecto, apuntando al origin del backend. Ese behavior debe permitir los métodos HTTP usados por la app (`GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`) y reenviar query strings, headers y cookies necesarios.
2. **HTTPS hacia el backend**: el origin de `/api/*` debe ser accesible mediante HTTPS o estar protegido detrás de un reverse proxy/Load Balancer con TLS. Evita que el navegador bloquee la aplicación por mixed content.
3. **CORS en el backend**: NestJS debe permitir el origen `https://d1hjojyfabiyi5.cloudfront.net`. Si `/api` se sirve bajo el mismo dominio, CORS deja de ser un problema para esas peticiones.
4. **Security group de EC2**: permite tráfico únicamente desde el reverse proxy, Load Balancer o CloudFront configurado, según tu arquitectura; evita abrir el puerto del backend más de lo necesario.

### Reiniciar el backend en EC2

```bash
ssh -i "tu-key.pem" ubuntu@34.227.197.241
cd ~/backend
docker-compose down
docker-compose up --build -d
docker-compose logs -f
```

> El backend vive fuera de este repo; este pipeline solo despliega el frontend. Si el código del backend está en otro repo, crea un workflow similar allá con `appleboy/ssh-action` para reiniciar el contenedor.

---

## Paso 7: Primer despliegue

```bash
git init
git add .
git commit -m "Add frontend + CI/CD to S3"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Ve a tu repositorio → **Actions** para ver el pipeline en acción. El deploy corre automáticamente en cada push a `main`.

---

## Comandos útiles

```bash
# Compilar localmente
yarn install --frozen-lockfile
yarn build

# Subir frontend manualmente (sin CI/CD)
aws s3 sync dist/ s3://tu-bucket --delete \
  --cache-control "public, max-age=31536000, immutable" --exclude "index.html"
aws s3 cp dist/index.html s3://tu-bucket/index.html --cache-control "no-cache" --content-type "text/html"

# Invalidar caché de CloudFront (obligatorio tras cada deploy si no corre el paso automático)
aws cloudfront create-invalidation --distribution-id TU_ID --paths "/*"

# Ver logs del backend en EC2
ssh -i "tu-key.pem" ubuntu@34.227.197.241
cd ~/backend && docker-compose logs -f
```

---

## Resumen de servicios

| Servicio | Uso | Costo |
|----------|-----|-------|
| S3 | Hosting frontend | ~$0.02/mes |
| CloudFront | CDN + SSL | ~$0.00 |
| EC2 | Backend | Free tier 12 meses |
| RDS | Base de datos | Free tier 12 meses |
| GitHub Actions | CI/CD | 2,000 min/mes gratis |

---

## Checklist

- [ ] Bucket S3 creado con acceso público y static website hosting
- [ ] Bucket policy configurada
- [ ] Usuario IAM o rol OIDC creado (Step 2)
- [ ] Secrets configurados en GitHub (`S3_BUCKET` + credenciales AWS + `CLOUDFRONT_ID`)
- [ ] CloudFront distribution creada (el frontend se sirve vía CloudFront en producción)
- [ ] Secreto `CLOUDFRONT_ID` = ID real de la distribución (si no, la invalidación se omite y el HTML viejo da 404)
- [ ] Security group de EC2 permite puerto 3000 y CORS habilitado en el backend
- [ ] Primer push a `main` → deploy automático funcionando
