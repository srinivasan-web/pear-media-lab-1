import { API_CONFIG, MESSAGES, STYLE_PRESETS } from "./constant";

const TONE_PRESETS = {
  cinematic: "cinematic framing, dramatic mood, premium color grading",
  commercial: "clean product polish, marketable clarity, premium styling",
  creative: "inventive details, immersive atmosphere, expressive finish",
  minimal: "refined simplicity, clean composition, restrained detail",
};

const DETAIL_PRESETS = {
  balanced: "a balanced level of visual fidelity",
  brief: "a concise reconstruction brief",
  high: "a highly detailed recreation brief",
};

const handleApiError = async (res) => {
  const rawBody = await res.text();
  let data = {};

  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    data = {
      message: rawBody,
    };
  }

  if (!res.ok) {
    const message =
      data?.error?.message || data?.message || "Something went wrong with API";
    const error = new Error(message);

    error.status = res.status;
    error.code = data?.code || data?.error?.code || "API_ERROR";
    error.details = data?.details || [];

    throw error;
  }

  return data;
};

const validateText = (input) => {
  if (!input || input.trim() === "") {
    throw new Error(MESSAGES.promptRequired);
  }
};

const normalizeWhitespace = (value) => value.trim().replace(/\s+/g, " ");

const postJson = async (url, payload) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleApiError(res);
};

const extractGeminiText = (data) =>
  data?.text?.trim() ||
  data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
  "";

const getStylePrompt = (style = "realistic") => {
  return (
    STYLE_PRESETS.find((item) => item.id === style)?.prompt ||
    STYLE_PRESETS[0].prompt
  );
};

const buildImageParameters = (model) => {
  if (model.includes("FLUX.1-schnell")) {
    return {
      num_inference_steps: 28,
      guidance_scale: 3.5,
    };
  }

  if (model.includes("FLUX.1-dev")) {
    return {
      num_inference_steps: 32,
      guidance_scale: 4,
    };
  }

  return {
    num_inference_steps: 40,
    guidance_scale: 7.5,
    negative_prompt:
      "blurry, low quality, distorted, bad anatomy, extra limbs, watermark, text, cropped, ugly",
  };
};

const enhancePromptForImage = (userPrompt, style = "realistic") => {
  const baseQuality =
    "ultra detailed, 4k, high resolution, sharp focus, professional quality";

  return `${userPrompt}, ${getStylePrompt(style)}, ${baseQuality}`;
};

const buildLocalEnhancedPrompt = (input, tone = "creative") => {
  const normalizedInput = normalizeWhitespace(input);
  const toneGuidance = TONE_PRESETS[tone] || TONE_PRESETS.creative;

  return `${normalizedInput}. Feature a clear hero subject, layered composition, dimensional lighting, an intentional camera angle, and a polished artistic finish. Mood and direction: ${toneGuidance}. Render with premium texture detail, natural contrast, strong focal separation, and high-end editorial quality.`;
};

const buildLocalAnalysisFallback = (detail = "balanced") => {
  const detailGuidance = DETAIL_PRESETS[detail] || DETAIL_PRESETS.balanced;

  return [
    "Main subject: Use the uploaded reference image as the subject anchor and preserve the strongest silhouette, pose, and focal details.",
    "Environment/background: Rebuild the surrounding scene with similar depth, spacing, and environmental context from the reference image.",
    "Color palette: Match the dominant hues, accent colors, and overall contrast pattern from the uploaded image.",
    "Lighting: Keep the same key light direction, shadow softness, and highlight intensity visible in the reference.",
    "Composition/camera angle: Maintain the original framing, perspective, subject placement, and depth-of-field cues.",
    "Artistic style: Follow the visual finish of the source image while refining textures and clarity for generation.",
    `Best recreation prompt: Recreate the uploaded reference image with ${detailGuidance}. Preserve subject identity, camera framing, background structure, palette balance, and lighting relationships while delivering a polished final render.`,
  ].join("\n");
};

const callGeminiEnhance = async (input, { model, tone }) => {
  const data = await postJson(API_CONFIG.geminiEnhanceUrl, {
    input,
    model,
    tone,
  });

  return extractGeminiText(data);
};

const callGeminiAnalyze = async (base64Image, { detail, model }) => {
  const data = await postJson(API_CONFIG.geminiAnalyzeUrl, {
    base64Image,
    detail,
    model,
  });

  return extractGeminiText(data);
};

export const getEnhancedPrompt = async (input, options = {}) => {
  const { model = "gemini-2.5-flash", tone = "creative" } = options;

  validateText(input);

  try {
    const result = await callGeminiEnhance(input, {
      model,
      tone,
    });

    return result || buildLocalEnhancedPrompt(input, tone);
  } catch (err) {
    console.warn(
      "Enhance Error: backend Gemini route unavailable, using local fallback.",
      err,
    );
    return buildLocalEnhancedPrompt(input, tone);
  }
};

export const generateImage = async (userPrompt, options = {}) => {
  const {
    style = "realistic",
    model = "stabilityai/stable-diffusion-xl-base-1.0",
  } = options;

  try {
    validateText(userPrompt);

    const finalPrompt = enhancePromptForImage(userPrompt, style);
    const res = await fetch(API_CONFIG.imageGenerationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: finalPrompt,
        parameters: buildImageParameters(model),
      }),
    });

    const data = await handleApiError(res);

    return {
      imageUrl: `data:${data.mimeType};base64,${data.imageBase64}`,
      finalPrompt,
      model: data.model || model,
    };
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const analyzeImage = async (base64Image, options = {}) => {
  const { model = "gemini-2.5-flash", detail = "balanced" } = options;

  if (!base64Image) {
    throw new Error(MESSAGES.imageRequired);
  }

  try {
    const result = await callGeminiAnalyze(base64Image, {
      detail,
      model,
    });

    return result || buildLocalAnalysisFallback(detail);
  } catch (err) {
    console.warn(
      "Analyze Error: backend Gemini route unavailable, using local fallback.",
      err,
    );
    return buildLocalAnalysisFallback(detail);
  }
};
