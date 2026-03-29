import { createServer } from "node:http";
import { getEnv } from "./lib/env.mjs";
import {
  createGeminiAnalyzeResponse,
  createGeminiEnhanceResponse,
  GEMINI_ANALYZE_ROUTE,
  GEMINI_ENHANCE_ROUTE,
} from "./lib/geminiProxy.mjs";
import { createImageProxyResponse, IMAGE_ROUTE } from "./lib/imageProxy.mjs";

const env = getEnv();
const requestedPort = Number(env.PORT || env.IMAGE_API_PORT || 8788);
const candidatePorts = env.PORT
  ? [requestedPort]
  : Array.from({ length: 6 }, (_, index) => requestedPort + index);

const json = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    json(res, 200, {
      status: "ok",
      service: "image-api",
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === IMAGE_ROUTE) {
    try {
      const body = await getBody(req);
      const payload = JSON.parse(body || "{}");
      const { model, prompt, parameters } = payload;
      const result = await createImageProxyResponse({
        env: getEnv(),
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
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === GEMINI_ENHANCE_ROUTE) {
    try {
      const body = await getBody(req);
      const payload = JSON.parse(body || "{}");
      const result = await createGeminiEnhanceResponse({
        env: getEnv(),
        input: payload.input,
        model: payload.model,
        tone: payload.tone,
      });

      json(res, result.statusCode, result.payload);
    } catch (error) {
      json(res, 500, {
        code: "SERVER_ERROR",
        message: error?.message || "Unexpected server error",
      });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === GEMINI_ANALYZE_ROUTE) {
    try {
      const body = await getBody(req);
      const payload = JSON.parse(body || "{}");
      const result = await createGeminiAnalyzeResponse({
        base64Image: payload.base64Image,
        detail: payload.detail,
        env: getEnv(),
        model: payload.model,
      });

      json(res, result.statusCode, result.payload);
    } catch (error) {
      json(res, 500, {
        code: "SERVER_ERROR",
        message: error?.message || "Unexpected server error",
      });
    }
    return;
  }

  json(res, 404, {
    code: "NOT_FOUND",
    message: "Route not found",
  });
});

const listenOnPort = (portIndex = 0) => {
  const port = candidatePorts[portIndex];

  server.once("error", (error) => {
    if (error?.code === "EADDRINUSE" && portIndex < candidatePorts.length - 1) {
      const nextPort = candidatePorts[portIndex + 1];

      console.warn(
        `Port ${port} is already in use. Trying Image API on http://localhost:${nextPort} instead.`,
      );
      listenOnPort(portIndex + 1);
      return;
    }

    if (error?.code === "EADDRINUSE") {
      const attemptedPorts = candidatePorts.join(", ");

      throw new Error(
        `Image API could not find a free local port. Tried: ${attemptedPorts}. Stop the existing local servers or set IMAGE_API_PORT to an open port.`,
      );
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`Image API listening on http://localhost:${port}`);
  });
};

listenOnPort();
