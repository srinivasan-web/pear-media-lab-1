import { API_CONFIG, MESSAGES, STYLE_PRESETS } from "./constant";

const GEMINI_FLASH_MODEL = "gemini-2.5-flash";

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

const isGeminiQuotaError = (error) => {
  const message = error?.message?.toLowerCase() || "";

  return (
    message.includes("quota exceeded") ||
    message.includes("free_tier") ||
    message.includes("rate limit")
  );
};

const validateText = (input) => {
  if (!input || input.trim() === "") {
    throw new Error(MESSAGES.promptRequired);
  }
};

const callGemini = async (model, parts) => {
  if (!API_CONFIG.geminiApiKey) {
    throw new Error("Missing Gemini API key. Add VITE_GEMINI_KEY to your env.");
  }

  const res = await fetch(
    `${API_CONFIG.geminiBaseUrl}/${model}:generateContent?key=${API_CONFIG.geminiApiKey}`,
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

  return handleApiError(res);
};

const callGeminiWithFallback = async (model, parts) => {
  try {
    return await callGemini(model, parts);
  } catch (error) {
    if (model === "gemini-2.5-pro" && isGeminiQuotaError(error)) {
      console.warn(
        "Gemini Pro quota is unavailable. Falling back to Gemini 2.5 Flash.",
      );
      return callGemini(GEMINI_FLASH_MODEL, parts);
    }

    throw error;
  }
};

const getStylePrompt = (style = "realistic") => {
  return (
    STYLE_PRESETS.find((item) => item.id === style)?.prompt ||
    STYLE_PRESETS[0].prompt
  );
};

const buildEnhancedPromptInstruction = (input, tone = "creative") => {
  return `You are an expert prompt engineer.
Turn the user idea into a polished image-generation prompt.
Requirements:
- Keep the output to 45-70 words
- Mention subject, composition, lighting, camera angle, mood, and artistic finish
- Do not add numbering or explanation
- Keep the final prompt concise but vivid
- Tone: ${tone}

User idea: ${input}`;
};

const buildAnalysisInstruction = (detail = "balanced") => {
  return `Analyze this image for AI image recreation.
Return a compact description with these sections:
- Main subject
- Environment/background
- Color palette
- Lighting
- Composition/camera angle
- Artistic style
- Best recreation prompt

Detail level: ${detail}`;
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

export const getEnhancedPrompt = async (
  input,
  options = {},
) => {
  const {
    model = "gemini-2.5-flash",
    tone = "creative",
  } = options;

  try {
    validateText(input);

    const data = await callGeminiWithFallback(model, [
      {
        text: buildEnhancedPromptInstruction(input, tone),
      },
    ]);

    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || input;
  } catch (err) {
    console.error("Enhance Error:", err.message);
    throw err;
  }
};

export const generateImage = async (
  userPrompt,
  options = {},
) => {
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

export const analyzeImage = async (
  base64Image,
  options = {},
) => {
  const {
    model = "gemini-2.5-flash",
    detail = "balanced",
  } = options;

  try {
    if (!base64Image) {
      throw new Error(MESSAGES.imageRequired);
    }

    const [meta, encoded] = base64Image.split(",");
    const mimeType = meta?.match(/data:(.*?);base64/)?.[1] || "image/jpeg";

    const data = await callGeminiWithFallback(model, [
      {
        text: buildAnalysisInstruction(detail),
      },
      {
        inlineData: {
          mimeType,
          data: encoded,
        },
      },
    ]);

    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  } catch (err) {
    console.error("Analyze Error:", err.message);
    throw err;
  }
};
