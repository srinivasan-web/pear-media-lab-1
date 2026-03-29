# Pear Media Lab

## Local setup

1. Copy `.env.example` to `.env`
2. Set `VITE_GEMINI_KEY`
3. Set `HF_TOKEN`
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
