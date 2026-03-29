import { createImageProxyResponse } from "../../backend/lib/imageProxy.mjs";

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody);
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST for this endpoint",
    });
    return;
  }

  const { model, prompt, parameters } = await readJsonBody(req);
  const result = await createImageProxyResponse({
    env: process.env,
    model,
    prompt,
    parameters,
  });

  res.status(result.statusCode).json(result.payload);
}
