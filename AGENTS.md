# AGENTS.md

React 18 + Vite 5 SPA (JSX, no TypeScript) — stock management UI. Spanish-language UI (`index.html` is `lang="es"`).

## Commands

- **yarn, not npm** — repo has `yarn.lock` and no `package-lock.json`; `npm ci` fails. Use `yarn install --frozen-lockfile`.
- `yarn dev` → Vite dev server on **port 3001** (set in `vite.config.js`)
- `yarn build` → outputs to `dist/` (Vite default, **not** `build/`)
- `yarn preview` → serves the production build
- **No test, lint, or typecheck scripts exist** — `yarn build` is the only verification step.

## Wiring

- All API calls go through `src/services/api.js` (axios instance). Base URL is **hardcoded** to the EC2 backend: `http://34.227.197.241:3000`.
- The Vite dev proxy (`/api` → `localhost:3000` in `vite.config.js`) is effectively **unused** — `api.js` uses the absolute EC2 URL, which bypasses any proxy.
- Pages live in `src/pages/` (Products, Sales, Caja, Categories, Tags, Reposicion, History); each fetches via `api` directly. Routing: react-router v6 `BrowserRouter` in `src/main.jsx`.
- Backend (NestJS on EC2, docker-compose) is a **separate repo** — nothing backend-side is in this repo.

## Deploy

- `.github/workflows/deploy.yml`: builds on push/PR to `main`; deploys to S3 (`aws s3 sync dist/ s3://$S3_BUCKET --delete`) on push to `main` only; invalidates CloudFront if `CLOUDFRONT_ID` secret is set.
- Required GitHub secrets: `S3_BUCKET` + AWS creds (`AWS_ROLE_ARN` for OIDC, else `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`). Details and IAM policy JSON: `FRONTEND_DEPLOY.md`.
- Browser-facing gotchas (documented in FRONTEND_DEPLOY.md): EC2 security group must allow port 3000; backend needs CORS for the S3/CloudFront origin; HTTPS frontend + `http://` backend = mixed-content blocking.

## Gotchas

- **No `.gitignore` exists** — `git add .` would commit `node_modules/`. Add one (`node_modules/`, `dist/`) before the first commit.
- S3 static hosting must use `index.html` as the **error document** too, or react-router deep links (e.g. `/products`) 404.
