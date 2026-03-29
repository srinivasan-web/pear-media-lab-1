import { Buffer } from "node:buffer";
import { InferenceClient } from "@huggingface/inference";

export const IMAGE_ROUTE = "/api/image/generate";

export const createImageProxyResponse = async ({ env, model, prompt, parameters }) => {
  const token = env.HF_TOKEN?.trim() || env.VITE_HF_TOKEN?.trim();
  const provider = env.HF_PROVIDER?.trim() || "hf-inference";

  if (!token) {
    return {
      statusCode: 500,
      payload: {
        code: "HF_TOKEN_MISSING",
        message:
          "HF_TOKEN is missing on the server. Add it to my-app/.env (or the hosting environment) and restart the app.",
        details: [
          "Use HF_TOKEN for the backend proxy.",
          "VITE_HF_TOKEN is only kept as a temporary fallback for older local env files.",
        ],
      },
    };
  }

  if (!model || !prompt) {
    return {
      statusCode: 400,
      payload: {
        code: "INVALID_REQUEST",
        message: "model and prompt are required",
      },
    };
  }

  try {
    const client = new InferenceClient(token);
    const imageBlob = await client.textToImage({
      model,
      provider,
      inputs: prompt,
      parameters,
    });
    const arrayBuffer = await imageBlob.arrayBuffer();

    return {
      statusCode: 200,
      payload: {
        imageBase64: Buffer.from(arrayBuffer).toString("base64"),
        mimeType: imageBlob.type || "image/png",
        model,
        provider,
      },
    };
  } catch (error) {
    return mapProviderError(error, provider);
  }
};

const mapProviderError = (error, provider) => {
  const rawMessage = error?.message || "Image generation failed";
  const message = rawMessage.toLowerCase();

  if (
    message.includes("invalid username or password") ||
    message.includes("authorization header is correct") ||
    message.includes("unauthorized") ||
    message.includes("authentication")
  ) {
    return {
      statusCode: 401,
      payload: {
        code: "HF_AUTH_INVALID",
        message:
          "Hugging Face rejected the server token for image generation. Refresh HF_TOKEN, restart the app, and confirm the selected provider can use that token.",
        details: [
          `Provider in use: ${provider}`,
          "Set HF_TOKEN with a valid Hugging Face User Access Token.",
          "If needed, change HF_PROVIDER in the server environment to a provider your account can access.",
        ],
      },
    };
  }

  if (message.includes("model") && message.includes("loading")) {
    return {
      statusCode: 503,
      payload: {
        code: "HF_MODEL_LOADING",
        message:
          "The selected image model is still warming up on Hugging Face. Wait a moment and try again.",
        details: [],
      },
    };
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return {
      statusCode: 429,
      payload: {
        code: "HF_RATE_LIMITED",
        message: "Hugging Face rate-limited this request. Wait a bit and try again.",
        details: [],
      },
    };
  }

  return {
    statusCode: 500,
    payload: {
      code: "HF_IMAGE_FAILED",
      message: rawMessage,
      details: [`Provider in use: ${provider}`],
    },
  };
};
