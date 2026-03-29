# Repo Structure

This project is currently organized as one application folder plus deployment config.

## frontend

Frontend source lives in `my-app/`:

- `my-app/src/`
- `my-app/public/`
- `my-app/index.html`
- `my-app/vite.config.js`

Frontend build output:

- `my-app/dist/`

## backend

Backend source also lives in `my-app/`:

- `my-app/server.mjs`
- `my-app/api-server.mjs`
- `my-app/lib/imageProxy.mjs`

## deploy

Deployment config lives at the repo root and in `deploy/`:

- `render.yaml`
- `render.api.yaml`
- `vercel.json`
- `deploy/nginx/pear-media-lab.conf`
- `deploy/pm2/ecosystem.config.cjs`

## local-only

These should stay local and should not contain committed secrets:

- `my-app/.env`
- `my-app/node_modules/`
- `node_modules/`
- `.qodo/`
