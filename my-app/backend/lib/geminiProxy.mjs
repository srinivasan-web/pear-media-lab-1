const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_ENHANCE_ROUTE = "/api/gemini/enhance";
export const GEMINI_ANALYZE_ROUTE = "/api/gemini/analyze";

const TONE_PRESETS = {
  cinematic: "cinematic framing, dramatic mood, premium color grading",
  commercial: "clean product polish, marketable clarity, premium styling",
  creative: "inventive details, immersive atmosphere, expressive finish",
  minimal: "refined simplicity, clean composition, restrained detail",
};

const DETAIL_PRESETS = {
  balanced: "Preserve the overall scene, palette, and composition with natural detail.",
  brief: "Keep the recreation concise and focused on the most obvious visual anchors.",
  high: "Preserve fine textures, layered depth cues, and nuanced lighting relationships.",
};

const extractGeminiText = (payload) =>
  payload?.candidates
    ?.flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text?.trim())
    .filter(Boolean)
    .join("\n\n") || "";

const buildGeminiError = (statusCode, code, message, details = []) => ({
  statusCode,
  payload: {
    code,
    details,
    message,
  },
});

const parseJson = (rawBody) => {
  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return {
      message: rawBody,
    };
  }
};

const isQuotaError = (message = "") => {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("quota exceeded") ||
    normalized.includes("free_tier") ||
    normalized.includes("rate limit") ||
    normalized.includes("resource_exhausted")
  );
};

const getGeminiApiKey = (env) =>
  env.GEMINI_API_KEY?.trim() || env.VITE_GEMINI_KEY?.trim() || "";

const createModelList = (model) =>
  model === "gemini-2.5-pro"
    ? ["gemini-2.5-pro", "gemini-2.5-flash"]
    : [model || "gemini-2.5-flash"];

const callGemini = async ({ env, model, parts }) => {
  const apiKey = getGeminiApiKey(env);

  if (!apiKey) {
    return buildGeminiError(
      500,
      "GEMINI_KEY_MISSING",
      "Gemini API key is missing in the backend environment.",
    );
  }

  let lastError = buildGeminiError(
    500,
    "GEMINI_REQUEST_FAILED",
    "Gemini request failed.",
  );

  for (const candidateModel of createModelList(model)) {
    const response = await fetch(
      `${GEMINI_BASE_URL}/${candidateModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
        }),
      },
    );
    const rawBody = await response.text();
    const payload = parseJson(rawBody);

    if (response.ok) {
      return {
        statusCode: 200,
        payload: {
          model: candidateModel,
          text: extractGeminiText(payload),
        },
      };
    }

    const message =
      payload?.error?.message || payload?.message || "Gemini request failed.";
    const code =
      payload?.code || payload?.error?.status || payload?.error?.code || "GEMINI_REQUEST_FAILED";
    const details = payload?.details || payload?.error?.details || [];

    lastError = buildGeminiError(
      response.status || 500,
      code,
      message,
      details,
    );

    if (
      candidateModel === "gemini-2.5-pro" &&
      createModelList(model).includes("gemini-2.5-flash") &&
      isQuotaError(message)
    ) {
      continue;
    }

    break;
  }

  return lastError;
};

const buildEnhancedPromptInstruction = (input, tone = "creative") => `You are an expert prompt engineer.
Turn the user idea into a polished image-generation prompt.
Requirements:
- Keep the output to 45-70 words
- Mention subject, composition, lighting, camera angle, mood, and artistic finish
- Do not add numbering or explanation
- Keep the final prompt concise but vivid
- Tone: ${tone}
- Emphasis: ${TONE_PRESETS[tone] || TONE_PRESETS.creative}

User idea: ${input}`;

const buildAnalysisInstruction = (detail = "balanced") => `Analyze this image for AI image recreation.
Return a compact description with these sections:
- Main subject
- Environment/background
- Color palette
- Lighting
- Composition/camera angle
- Artistic style
- Best recreation prompt

Detail level: ${detail}
Guidance: ${DETAIL_PRESETS[detail] || DETAIL_PRESETS.balanced}`;

const parseInlineImage = (base64Image) => {
  if (!base64Image || typeof base64Image !== "string") {
    return null;
  }

  const [meta, encoded] = base64Image.split(",");
  const mimeType = meta?.match(/data:(.*?);base64/)?.[1] || "image/jpeg";

  if (!encoded) {
    return null;
  }

  return {
    data: encoded,
    mimeType,
  };
};

export const createGeminiEnhanceResponse = async ({
  env,
  input,
  model,
  tone,
}) => {
  if (!input || !input.trim()) {
    return buildGeminiError(400, "PROMPT_REQUIRED", "Prompt cannot be empty.");
  }

  return callGemini({
    env,
    model,
    parts: [
      {
        text: buildEnhancedPromptInstruction(input.trim(), tone),
      },
    ],
  });
};

export const createGeminiAnalyzeResponse = async ({
  base64Image,
  detail,
  env,
  model,
}) => {
  const image = parseInlineImage(base64Image);

  if (!image) {
    return buildGeminiError(
      400,
      "IMAGE_REQUIRED",
      "A base64-encoded image is required for analysis.",
    );
  }

  return callGemini({
    env,
    model,
    parts: [
      {
        text: buildAnalysisInstruction(detail),
      },
      {
        inlineData: image,
      },
    ],
  });
};
