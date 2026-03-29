import { createServer } from "node:http";
import { loadEnv } from "vite";
import { createImageProxyResponse, IMAGE_ROUTE } from "./lib/imageProxy.mjs";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const port = Number(env.IMAGE_API_PORT || 8787);

const json = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(payload));
};

const getBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== IMAGE_ROUTE) {
    json(res, 404, {
      code: "NOT_FOUND",
      message: "Route not found",
    });
    return;
  }

  try {
    const body = await getBody(req);
    const payload = JSON.parse(body || "{}");
    const { model, prompt, parameters } = payload;
    const result = await createImageProxyResponse({
      env,
      model,
      prompt,
      parameters,
    });

    json(res, result.statusCode, result.payload);
  } catch (error) {
    json(res, 500, {
      code: "SERVER_ERROR",
      message: error?.message || "Unexpected server error",
    });
  }
});

server.listen(port, () => {
  console.log(`Image proxy listening on http://localhost:${port}`);
});
