import { loadEnv } from "vite";
import { createImageProxyResponse } from "../../my-app/lib/imageProxy.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST for this endpoint",
    });
    return;
  }

  const env = loadEnv(process.env.VERCEL_ENV || process.env.NODE_ENV || "production", process.cwd(), "");
  const { model, prompt, parameters } = req.body || {};
  const result = await createImageProxyResponse({
    env: {
      ...env,
      ...process.env,
    },
    model,
    prompt,
    parameters,
  });

  res.status(result.statusCode).json(result.payload);
}
