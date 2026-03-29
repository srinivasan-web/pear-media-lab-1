# Repo Structure

This project is currently organized as one application folder plus deployment config.

## frontend

Frontend source lives in `my-app/`:

- `my-app/src/`
- `my-app/public/`
- `my-app/index.html`
- `my-app/vite.config.js`
- `my-app/eslint.config.js`

Frontend build output:

- `my-app/dist/`

## backend

Backend source also lives in `my-app/`:

- `my-app/backend/server.mjs`
- `my-app/backend/api-server.mjs`
- `my-app/backend/check-env.mjs`
- `my-app/backend/lib/env.mjs`
- `my-app/backend/lib/imageProxy.mjs`

## deploy

Deployment config lives at the repo root and in `my-app/deploy/`:

- `render.yaml`
- `render.api.yaml`
- `my-app/vercel.json`
- `my-app/deploy/nginx/pear-media-lab.conf`
- `my-app/deploy/pm2/ecosystem.config.cjs`

## local-only

These should stay local and should not contain committed secrets:

- `my-app/.env`
- `my-app/backend/.env`
- `my-app/node_modules/`
- `node_modules/`
- `.qodo/`
