# Pear Media Lab

This folder is the single application root.

## Local setup

1. Copy `.env.example` to `.env`
2. Copy `backend/.env.example` to `backend/.env`
3. Optional for local-only legacy browser fallback: set `VITE_GEMINI_KEY` in `.env`
4. Set `HF_TOKEN` in `backend/.env`
5. Set `GEMINI_API_KEY` in `backend/.env` to enable Gemini prompt/image fallback on the server
6. Optional: set `HF_PROVIDER=hf-inference` in `backend/.env`
7. Optional: set `GEMINI_IMAGE_MODEL=gemini-2.5-flash-image` in `backend/.env`
8. Run `npm install`
9. Run `npm run dev`

Useful scripts:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run start:api`
- `npm run check:env`

Local port defaults:

- `npm run start` serves the full app on `8787`
- `npm run start:api` serves the API-only backend on `8788`
- If the local API-only port is already busy, `start:api` will try the next local port automatically

## Image generation

Image generation runs through the backend proxy so the Hugging Face token stays server-side.

- Frontend endpoint: `VITE_IMAGE_API_URL`
- Default frontend path: `/api/image/generate`
- Local dev proxy target: `http://localhost:8787/api/image/generate`
- Local API-only target: `http://localhost:8788/api/image/generate`
- Server token env var: `HF_TOKEN` in `backend/.env`
- Server Gemini fallback key: `GEMINI_API_KEY` in `backend/.env`
- Preferred Gemini image fallback model: `GEMINI_IMAGE_MODEL=gemini-2.5-flash-image`
- Preferred provider env var: `HF_PROVIDER=hf-inference`
- Automatic fallback: if Hugging Face routed credits are depleted or the HF provider is unavailable, the backend can switch to Gemini image generation when `GEMINI_API_KEY` is configured

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
- Set `VITE_IMAGE_API_URL` to your backend URL, for example `https://pear-media-lab-1-2.onrender.com/api/image/generate`

## Structure

- Frontend: `src`, `public`, `index.html`, `vite.config.js`
- Backend: `backend/server.mjs`, `backend/api-server.mjs`, `backend/check-env.mjs`, `backend/lib/imageProxy.mjs`
- API adapter: `api/image/generate.mjs`
