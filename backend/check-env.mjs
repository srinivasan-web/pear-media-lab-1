import { getEnv } from "./lib/env.mjs";

const env = getEnv();

console.log(
  JSON.stringify(
    {
      hfTokenPresent: Boolean(env.HF_TOKEN),
      hfTokenPrefix: env.HF_TOKEN ? env.HF_TOKEN.slice(0, 3) : null,
      hfProvider: env.HF_PROVIDER || null,
      imageApiPort: env.IMAGE_API_PORT || null,
      geminiPresent: Boolean(env.VITE_GEMINI_KEY),
      imageApiUrlPresent: Boolean(env.VITE_IMAGE_API_URL),
    },
    null,
    2,
  ),
);
