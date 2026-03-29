import { Buffer } from "node:buffer";
import { InferenceClient } from "@huggingface/inference";

export const IMAGE_ROUTE = "/api/image/generate";

const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const GEMINI_IMAGE_MODEL_FALLBACKS = [
  DEFAULT_GEMINI_IMAGE_MODEL,
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
];
const GEMINI_IMAGE_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const buildResponse = (statusCode, payload) => ({
  statusCode,
  payload,
});

const getHfToken = (env) => env.HF_TOKEN?.trim() || env.VITE_HF_TOKEN?.trim();

const getGeminiApiKey = (env) =>
  env.GEMINI_API_KEY?.trim() || env.VITE_GEMINI_KEY?.trim() || "";

const buildHfTokenMissingError = () =>
  buildResponse(500, {
    code: "HF_TOKEN_MISSING",
    message:
      "HF_TOKEN is missing on the server. Add HF_TOKEN or GEMINI_API_KEY to backend/.env (or the hosting environment) and restart the app.",
    details: [
      "Use HF_TOKEN for Hugging Face image routing.",
      "Use GEMINI_API_KEY to enable Gemini image generation fallback.",
      "VITE_HF_TOKEN is only kept as a temporary fallback for older local env files.",
    ],
  });

const buildHfTokenInvalidError = () =>
  buildResponse(500, {
    code: "HF_TOKEN_INVALID_FORMAT",
    message:
      "HF_TOKEN does not look like a valid Hugging Face access token. Update it in backend/.env or configure GEMINI_API_KEY as a fallback.",
    details: [
      "Use a Hugging Face User Access Token that starts with hf_.",
      "If you just changed the token locally, the dev proxy now reloads env values on each request.",
    ],
  });

const buildInvalidRequestError = () =>
  buildResponse(400, {
    code: "INVALID_REQUEST",
    message: "model and prompt are required",
  });

const buildGeminiFallbackUnavailableError = (hfFailure) =>
  buildResponse(hfFailure.statusCode, {
    code: hfFailure.payload.code,
    message: hfFailure.payload.message,
    details: [
      ...(hfFailure.payload.details || []),
      "Add GEMINI_API_KEY to the backend environment to enable automatic Gemini image fallback.",
    ],
  });

const buildCombinedProviderError = (hfFailure, geminiFailure) =>
  buildResponse(geminiFailure.statusCode || hfFailure.statusCode || 500, {
    code: "IMAGE_PROVIDER_UNAVAILABLE",
    message:
      "The image server could not generate an image with either Hugging Face or Gemini.",
    details: [
      `Hugging Face: ${hfFailure.payload.message}`,
      `Gemini: ${geminiFailure.payload.message}`,
      ...((geminiFailure.payload.details || []).slice(0, 2)),
    ],
  });

const isHfFallbackCandidate = (result) =>
  [
    "HF_AUTH_INVALID",
    "HF_CREDITS_DEPLETED",
    "HF_IMAGE_FAILED",
    "HF_MODEL_LOADING",
    "HF_RATE_LIMITED",
    "HF_TOKEN_INVALID_FORMAT",
    "HF_TOKEN_MISSING",
  ].includes(result?.payload?.code);

const extractGeminiImagePart = (payload) =>
  payload?.candidates
    ?.flatMap((candidate) => candidate?.content?.parts || [])
    .find((part) => part?.inlineData?.data);

const createGeminiModelList = (env) => {
  const preferredModel = env.GEMINI_IMAGE_MODEL?.trim();

  return preferredModel
    ? [...new Set([preferredModel, ...GEMINI_IMAGE_MODEL_FALLBACKS])]
    : GEMINI_IMAGE_MODEL_FALLBACKS;
};

const shouldRetryGeminiWithAnotherModel = (statusCode, message = "") => {
  const normalized = message.toLowerCase();

  return (
    statusCode === 404 ||
    statusCode === 429 ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("not found") ||
    normalized.includes("unsupported") ||
    normalized.includes("not available")
  );
};

const parseJson = (rawBody) => {
  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return {
      message: rawBody,
    };
  }
};

const createHfImageResponse = async ({
  model,
  parameters,
  prompt,
  provider,
  token,
}) => {
  try {
    const client = new InferenceClient(token);
    const imageBlob = await client.textToImage({
      model,
      provider,
      inputs: prompt,
      parameters,
    });
    const arrayBuffer = await imageBlob.arrayBuffer();

    return buildResponse(200, {
      imageBase64: Buffer.from(arrayBuffer).toString("base64"),
      mimeType: imageBlob.type || "image/png",
      model,
      provider,
      requestedModel: model,
    });
  } catch (error) {
    return mapProviderError(error, provider);
  }
};

const createGeminiImageResponse = async ({
  apiKey,
  candidateModels,
  prompt,
  requestedModel,
  requestedProvider,
}) => {
  const attemptedModels = [];
  let lastFailure = buildResponse(500, {
    code: "GEMINI_IMAGE_FALLBACK_FAILED",
    message: "Gemini image generation failed.",
    details: [],
  });

  for (const responseModel of candidateModels) {
    attemptedModels.push(responseModel);

    try {
      const response = await fetch(
        `${GEMINI_IMAGE_BASE_URL}/${responseModel}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
        },
      );
      const rawBody = await response.text();
      const payload = parseJson(rawBody);

      if (!response.ok) {
        const message =
          payload?.error?.message ||
          payload?.message ||
          "Gemini image generation failed.";

        lastFailure = buildResponse(response.status || 500, {
          code: "GEMINI_IMAGE_FALLBACK_FAILED",
          message,
          details: [
            `Gemini image model: ${responseModel}`,
            `Attempted Gemini models: ${attemptedModels.join(", ")}`,
          ],
        });

        if (
          shouldRetryGeminiWithAnotherModel(
            response.status || 500,
            message,
          )
        ) {
          continue;
        }

        return lastFailure;
      }

      const imagePart = extractGeminiImagePart(payload);

      if (!imagePart?.inlineData?.data) {
        lastFailure = buildResponse(502, {
          code: "GEMINI_IMAGE_EMPTY",
          message:
            "Gemini returned a response without image data for this prompt.",
          details: [
            `Gemini image model: ${responseModel}`,
            `Attempted Gemini models: ${attemptedModels.join(", ")}`,
          ],
        });
        continue;
      }

      return buildResponse(200, {
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || "image/png",
        model: responseModel,
        provider: "google-gemini",
        requestedModel,
        requestedProvider,
      });
    } catch (error) {
      lastFailure = buildResponse(500, {
        code: "GEMINI_IMAGE_FALLBACK_FAILED",
        message: error?.message || "Gemini image generation failed.",
        details: [
          `Gemini image model: ${responseModel}`,
          `Attempted Gemini models: ${attemptedModels.join(", ")}`,
        ],
      });
    }
  }

  return lastFailure;
};

export const createImageProxyResponse = async ({
  env,
  model,
  prompt,
  parameters,
}) => {
  if (!model || !prompt) {
    return buildInvalidRequestError();
  }

  const token = getHfToken(env);
  const provider = env.HF_PROVIDER?.trim() || "hf-inference";
  const geminiApiKey = getGeminiApiKey(env);
  const geminiCandidateModels = createGeminiModelList(env);

  let hfResult = null;

  if (!token) {
    hfResult = buildHfTokenMissingError();
  } else if (!token.startsWith("hf_")) {
    hfResult = buildHfTokenInvalidError();
  } else {
    hfResult = await createHfImageResponse({
      model,
      parameters,
      prompt,
      provider,
      token,
    });

    if (hfResult.statusCode === 200) {
      return hfResult;
    }
  }

  if (!geminiApiKey || !isHfFallbackCandidate(hfResult)) {
    return geminiApiKey
      ? hfResult
      : buildGeminiFallbackUnavailableError(hfResult);
  }

  const geminiResult = await createGeminiImageResponse({
    apiKey: geminiApiKey,
    candidateModels: geminiCandidateModels,
    prompt,
    requestedModel: model,
    requestedProvider: provider,
  });

  if (geminiResult.statusCode === 200) {
    return geminiResult;
  }

  return buildCombinedProviderError(hfResult, geminiResult);
};

const mapProviderError = (error, provider) => {
  const rawMessage = error?.message || "Image generation failed";
  const message = rawMessage.toLowerCase();

  if (
    message.includes("depleted your monthly included credits") ||
    message.includes("purchase pre-paid credits") ||
    message.includes("subscribe to pro")
  ) {
    return buildResponse(402, {
      code: "HF_CREDITS_DEPLETED",
      message:
        "Hugging Face routed inference credits are depleted for this account.",
      details: [
        `Provider in use: ${provider}`,
        "Add GEMINI_API_KEY to the backend to enable automatic Gemini image fallback.",
        "Alternatively purchase pre-paid Hugging Face credits or upgrade the Hugging Face account.",
      ],
    });
  }

  if (
    message.includes("invalid username or password") ||
    message.includes("authorization header is correct") ||
    message.includes("unauthorized") ||
    message.includes("authentication")
  ) {
    return buildResponse(401, {
      code: "HF_AUTH_INVALID",
      message:
        "Hugging Face rejected the server token for image generation. Refresh HF_TOKEN, restart the app, and confirm the selected provider can use that token.",
      details: [
        `Provider in use: ${provider}`,
        "Create a Hugging Face User Access Token with inference permissions.",
        "Set HF_TOKEN with a valid Hugging Face User Access Token.",
        "If needed, change HF_PROVIDER in the server environment to a provider your account can access.",
      ],
    });
  }

  if (message.includes("model") && message.includes("loading")) {
    return buildResponse(503, {
      code: "HF_MODEL_LOADING",
      message:
        "The selected image model is still warming up on Hugging Face. Wait a moment and try again.",
      details: [],
    });
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return buildResponse(429, {
      code: "HF_RATE_LIMITED",
      message: "Hugging Face rate-limited this request. Wait a bit and try again.",
      details: [],
    });
  }

  return buildResponse(500, {
    code: "HF_IMAGE_FAILED",
    message: rawMessage,
    details: [`Provider in use: ${provider}`],
  });
};
