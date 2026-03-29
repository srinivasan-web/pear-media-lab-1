# Pear Media Lab

This folder is the single application root.

## Local setup

1. Copy `.env.example` to `.env`
2. Copy `backend/.env.example` to `backend/.env`
3. Set `VITE_GEMINI_KEY` in `.env`
4. Set `HF_TOKEN` in `backend/.env`
5. Optional: set `HF_PROVIDER=hf-inference` in `backend/.env`
6. Run `npm install`
7. Run `npm run dev`

Useful scripts:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run start:api`
- `npm run check:env`

## Image generation

Image generation runs through the backend proxy so the Hugging Face token stays server-side.

- Frontend endpoint: `VITE_IMAGE_API_URL`
- Default frontend path: `/api/image/generate`
- Local dev proxy target: `http://localhost:8787/api/image/generate`
- Server token env var: `HF_TOKEN` in `backend/.env`
- Preferred provider env var: `HF_PROVIDER=hf-inference`

## Deployment

### Render

- Full app build command: `npm run render-build`
- Full app start command: `npm run start`
- API-only build command: `npm run render-build:api`
- API-only start command: `npm run start:api`
- Health check: `/health`

### VPS

- PM2 config: [ecosystem.config.cjs](/h:/pear-media-lab/my-app/deploy/pm2/ecosystem.config.cjs)
- Nginx config: [pear-media-lab.conf](/h:/pear-media-lab/my-app/deploy/nginx/pear-media-lab.conf)

Default ports in the PM2 config:

- frontend + API app on `8787`
- backend-only API on `8788`

### Vercel frontend + Render backend API

- Vercel config: [vercel.json](/h:/pear-media-lab/my-app/vercel.json)
- Build output: `dist`
- Set `VITE_IMAGE_API_URL` to your backend URL, for example `https://pear-media-lab-api.onrender.com/api/image/generate`

## Structure

- Frontend: `src`, `public`, `index.html`, `vite.config.js`
- Backend: `backend/server.mjs`, `backend/api-server.mjs`, `backend/check-env.mjs`, `backend/lib/imageProxy.mjs`
- API adapter: `api/image/generate.mjs`
