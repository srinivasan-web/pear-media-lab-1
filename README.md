# Pear Media Lab

The application now lives in a single canonical folder: `my-app/`.

## Working locally

1. Run `cd my-app`
2. Copy `.env.example` to `.env`
3. Copy `backend/.env.example` to `backend/.env`
4. Set `VITE_GEMINI_KEY` in `.env`
5. Set `HF_TOKEN` in `backend/.env`
6. Optional: set `HF_PROVIDER=hf-inference` in `backend/.env`
7. Run `npm install`
8. Run `npm run dev`

Useful app scripts:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run start:api`
- `npm run check:env`

## Deployment

The repo keeps the Render manifests at the root and points them at `my-app/`.

- Full app: [render.yaml](/h:/pear-media-lab/render.yaml)
- API-only service: [render.api.yaml](/h:/pear-media-lab/render.api.yaml)

App-specific deployment files stay inside `my-app/`:

- PM2 config: [ecosystem.config.cjs](/h:/pear-media-lab/my-app/deploy/pm2/ecosystem.config.cjs)
- Nginx config: [pear-media-lab.conf](/h:/pear-media-lab/my-app/deploy/nginx/pear-media-lab.conf)
- Vercel config: [vercel.json](/h:/pear-media-lab/my-app/vercel.json)

## Structure

- App root: `my-app/`
- Frontend: `my-app/src`, `my-app/public`, `my-app/index.html`, `my-app/vite.config.js`
- Backend: `my-app/backend/server.mjs`, `my-app/backend/api-server.mjs`, `my-app/backend/lib/imageProxy.mjs`
- API adapter: `my-app/api/image/generate.mjs`
