<<<<<<< HEAD
# pear-media-lab
=======
# Pear Media Lab

## Local setup

1. Copy `.env.example` to `.env`
2. Set `VITE_GEMINI_KEY`
3. Set `HF_TOKEN` to a Hugging Face User Access Token with inference permissions
4. Optional: set `HF_PROVIDER=hf-inference`
5. Run `npm install`
6. Run `npm run dev`

## Image generation

Image generation now runs through a backend proxy, so the Hugging Face token stays on the server side instead of the browser bundle.

- Frontend endpoint: `VITE_IMAGE_API_URL`
- Default frontend path: `/api/image/generate`
- Local dev proxy target: `http://localhost:8787/api/image/generate`
- Server token env var: `HF_TOKEN`
- Preferred provider env var: `HF_PROVIDER=hf-inference`

## Deployment options

This repo now supports three deployment paths:

1. Full Render deploy
2. VPS with PM2 and Nginx
3. Vercel frontend with Render backend API

### 1. Full Render deploy

Use [render.yaml](/h:/pear-media-lab/render.yaml).

What it does:

- builds the Vite frontend
- starts [server.mjs](/h:/pear-media-lab/my-app/server.mjs)
- serves both the web app and `POST /api/image/generate`

Render env vars:

- `VITE_GEMINI_KEY`
- `HF_TOKEN`
- Optional: `HF_PROVIDER=hf-inference`

### 2. VPS with PM2 and Nginx

Use these files:

- PM2 config: [ecosystem.config.cjs](/h:/pear-media-lab/deploy/pm2/ecosystem.config.cjs)
- Nginx config: [pear-media-lab.conf](/h:/pear-media-lab/deploy/nginx/pear-media-lab.conf)

Suggested server flow:

1. Clone the repo to `/var/www/pear-media-lab`
2. Run `cd /var/www/pear-media-lab/my-app`
3. Run `npm install`
4. Run `npm run build`
5. Add production env vars
6. Start with PM2:
   - `pm2 start /var/www/pear-media-lab/deploy/pm2/ecosystem.config.cjs`
7. Install the Nginx config and reload Nginx

Default ports in the PM2 config:

- frontend + API app on `8787`
- backend-only API on `8788`

### 3. Vercel frontend + Render backend API

Frontend deploy:

- Use [vercel.json](/h:/pear-media-lab/vercel.json)
- Build output is `my-app/dist`
- Set `VITE_GEMINI_KEY`
- Set `VITE_IMAGE_API_URL` to your Render backend URL, for example:
  `https://pear-media-lab-api.onrender.com/api/image/generate`

Backend deploy:

- Use [render.api.yaml](/h:/pear-media-lab/render.api.yaml)
- This starts [api-server.mjs](/h:/pear-media-lab/my-app/api-server.mjs)
- Set `HF_TOKEN`
- Optional: set `HF_PROVIDER=hf-inference`

Helpful endpoints:

- Full Render app health: `/health`
- Backend-only API health: `/health`

## Repo map

If you want to think about the project as `frontend`, `backend`, and `deploy`, use this map:

- Frontend: `my-app/src`, `my-app/public`, `my-app/index.html`, `my-app/vite.config.js`
- Backend: `my-app/server.mjs`, `my-app/api-server.mjs`, `my-app/lib/imageProxy.mjs`
- Deploy: `render.yaml`, `render.api.yaml`, `vercel.json`, `deploy/nginx/pear-media-lab.conf`, `deploy/pm2/ecosystem.config.cjs`

There is also a root structure guide at [REPO_STRUCTURE.md](/h:/pear-media-lab/REPO_STRUCTURE.md).
>>>>>>> 0ec8fd7 (production)
