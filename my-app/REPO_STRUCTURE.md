# Repo Structure

This folder is the single application root for Pear Media Lab.

## Frontend

- `src/`
- `public/`
- `index.html`
- `vite.config.js`
- `eslint.config.js`

Frontend build output:

- `dist/`

## Backend

- `backend/server.mjs`
- `backend/api-server.mjs`
- `backend/check-env.mjs`
- `backend/lib/env.mjs`
- `backend/lib/imageProxy.mjs`

## API adapters

- `api/image/generate.mjs`

## Deployment

- `render.yaml`
- `render.api.yaml`
- `vercel.json`
- `deploy/nginx/pear-media-lab.conf`
- `deploy/pm2/ecosystem.config.cjs`

## Local-only

These should stay local and should not contain committed secrets:

- `.env`
- `backend/.env`
- `node_modules/`
- `.qodo/`
