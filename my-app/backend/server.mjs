import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { getEnv } from "./lib/env.mjs";
import {
  createGeminiAnalyzeResponse,
  createGeminiEnhanceResponse,
  GEMINI_ANALYZE_ROUTE,
  GEMINI_ENHANCE_ROUTE,
} from "./lib/geminiProxy.mjs";
import { createImageProxyResponse, IMAGE_ROUTE } from "./lib/imageProxy.mjs";

const env = getEnv();
const port = Number(env.PORT || env.IMAGE_API_PORT || 8787);
const distDir = join(process.cwd(), "dist");

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".map": "application/json; charset=utf-8",
};

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

const sendStaticFile = (res, filePath) => {
  const extension = extname(filePath).toLowerCase();

  res.writeHead(200, {
    "Content-Type":
      CONTENT_TYPES[extension] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
};

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
      service: "web",
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

  if (req.method !== "GET" && req.method !== "HEAD") {
    json(res, 404, {
      code: "NOT_FOUND",
      message: "Route not found",
    });
    return;
  }

  const requestedPath =
    requestUrl.pathname === "/"
      ? join(distDir, "index.html")
      : join(distDir, requestUrl.pathname);

  if (existsSync(requestedPath)) {
    if (req.method === "HEAD") {
      res.writeHead(200);
      res.end();
      return;
    }

    sendStaticFile(res, requestedPath);
    return;
  }

  const appShell = join(distDir, "index.html");

  if (existsSync(appShell)) {
    if (req.method === "HEAD") {
      res.writeHead(200);
      res.end();
      return;
    }

    sendStaticFile(res, appShell);
    return;
  }

  json(res, 404, {
    code: "NOT_FOUND",
    message: "Route not found",
  });
});

server.listen(port, () => {
  console.log(`App listening on http://localhost:${port}`);
});
