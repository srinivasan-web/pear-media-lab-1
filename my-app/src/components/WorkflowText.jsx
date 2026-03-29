import React, { useMemo, useState } from "react";
import "../style/index.css";
import { generateImage, getEnhancedPrompt } from "../utils/apiHelpers";
import {
  IMAGE_GENERATION_MODELS,
  STYLE_PRESETS,
  TEXT_MODELS,
  TEXT_TEMPLATES,
} from "../utils/constant";
import usePersistentState from "../hooks/usePersistentState";

const buildFriendlyError = (error) => {
  const message = error?.message || "Something went wrong. Try again.";
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("quota exceeded") ||
    normalizedMessage.includes("free_tier")
  ) {
    return {
      message:
        "Gemini Pro quota is unavailable for this key right now. The app will use Gemini Flash when possible, but you may need to switch back to Flash in the model picker.",
      title: "Gemini quota limit reached",
      steps: [
        "Use Gemini 2.5 Flash for free-tier friendly requests.",
        "Wait for the quota window to reset if you want to try Pro again.",
      ],
    };
  }

  if (
    error?.code === "HF_CREDITS_DEPLETED" ||
    normalizedMessage.includes("monthly included credits")
  ) {
    return {
      message:
        "Hugging Face routed credits are depleted. The backend can switch to Gemini image generation if GEMINI_API_KEY is configured server-side.",
      title: "Hugging Face credits depleted",
      steps: [
        "Set GEMINI_API_KEY in backend/.env for local development or in the backend hosting environment for production.",
        "Restart local dev or redeploy the backend after updating the server environment.",
        "If you prefer Hugging Face only, purchase pre-paid credits or upgrade the Hugging Face plan.",
      ],
    };
  }

  if (error?.status === 401 || error?.code === "HF_AUTH_INVALID") {
    return {
      message,
      title: "Image generation needs Hugging Face setup",
      steps: [
        "Create or refresh a Hugging Face User Access Token with inference permissions.",
        "Set HF_TOKEN in backend/.env for local development or in your backend hosting environment.",
        "Keep HF_PROVIDER=hf-inference while debugging provider access.",
        "Try again after updating the token. Local dev now reloads env values on each request.",
      ],
    };
  }

  if (
    error?.status === 500 ||
    error?.code === "IMAGE_PROVIDER_UNAVAILABLE" ||
    error?.code === "GEMINI_IMAGE_FALLBACK_FAILED" ||
    error?.code === "HF_TOKEN_INVALID_FORMAT" ||
    error?.code === "HF_TOKEN_MISSING" ||
    error?.code === "HF_IMAGE_FAILED"
  ) {
    return {
      message,
      title: "Image generation server needs attention",
      steps: [
        "Check backend/.env for local development or the backend hosting environment for production, and confirm HF_TOKEN starts with hf_.",
        "Set GEMINI_API_KEY on the backend as a fallback image provider if you want the app to keep working when Hugging Face is unavailable.",
        "Restart local dev or redeploy the backend after updating the hosting environment.",
      ],
    };
  }

  return {
    message,
    title: "",
    steps: [],
  };
};

function WorkflowPrompt({ appTheme, setAppTheme }) {
  const [userPrompt, setUserPrompt] = usePersistentState(
    "pear-text-user-prompt",
    "",
  );
  const [enhancedPrompt, setEnhancedPrompt] = usePersistentState(
    "pear-text-enhanced-prompt",
    "",
  );
  const [approvedPrompt, setApprovedPrompt] = usePersistentState(
    "pear-text-approved-prompt",
    "",
  );
  const [generatedImages, setGeneratedImages] = useState([]);
  const [history, setHistory] = usePersistentState("pear-text-history", []);
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");
  const [setupHint, setSetupHint] = useState(null);
  const [selectedModel, setSelectedModel] = usePersistentState(
    "pear-text-selected-model",
    TEXT_MODELS[0].id,
  );
  const [tone, setTone] = usePersistentState("pear-text-tone", "creative");
  const [style, setStyle] = usePersistentState(
    "pear-text-style",
    STYLE_PRESETS[0].id,
  );
  const [imageModel, setImageModel] = usePersistentState(
    "pear-text-image-model",
    IMAGE_GENERATION_MODELS[0].id,
  );
  const [variationCount, setVariationCount] = usePersistentState(
    "pear-text-variation-count",
    2,
  );
  const [historyQuery, setHistoryQuery] = useState("");

  const templates = TEXT_TEMPLATES;
  const isLoading = loadingAction !== "";
  const filteredHistory = useMemo(() => {
    if (!historyQuery.trim()) {
      return history;
    }

    const query = historyQuery.toLowerCase();

    return history.filter((item) =>
      [item.source, item.result, item.tone, item.style, item.textModel, item.imageModel]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [history, historyQuery]);

  const stats = [
    { label: "Saved Runs", value: history.length },
    { label: "Prompt Words", value: enhancedPrompt.split(/\s+/).filter(Boolean).length || 0 },
    { label: "Variations", value: generatedImages.length || variationCount },
  ];

  const handleEnhance = async () => {
    if (!userPrompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    try {
      setLoadingAction("Enhancing prompt...");
      setError("");
      setSetupHint(null);
      setApprovedPrompt("");
      setGeneratedImages([]);

      const result = await getEnhancedPrompt(userPrompt, {
        model: selectedModel,
        tone,
      });

      setEnhancedPrompt(result);
      setHistory((prev) => [
        {
          id: Date.now(),
          source: userPrompt,
          result,
          model: TEXT_MODELS.find((item) => item.id === selectedModel)?.label,
          tone,
        },
        ...prev,
      ]);
    } catch (err) {
      const friendlyError = buildFriendlyError(err);
      setError(friendlyError.message || "Something went wrong. Try again.");
      setSetupHint(friendlyError.steps.length > 0 ? friendlyError : null);
    } finally {
      setLoadingAction("");
    }
  };

  const handleApprove = () => {
    if (!enhancedPrompt.trim()) {
      setError("Enhance a prompt first");
      return;
    }

    setApprovedPrompt(enhancedPrompt);
    setError("");
    setSetupHint(null);
  };

  const handleGenerateImages = async () => {
    if (!approvedPrompt.trim()) {
      setError("Approve the enhanced prompt first");
      return;
    }

    try {
      setLoadingAction("Generating images...");
      setError("");
      setSetupHint(null);

      const results = [];

      for (let index = 0; index < variationCount; index += 1) {
        setLoadingAction(`Generating image ${index + 1} of ${variationCount}...`);
        const result = await generateImage(approvedPrompt, {
          style,
          model: imageModel,
        });
        results.push(result);
      }

      setGeneratedImages(results);
      setHistory((prev) => [
        {
          id: Date.now(),
          source: userPrompt,
          result: approvedPrompt,
          textModel: TEXT_MODELS.find((item) => item.id === selectedModel)
            ?.label,
          imageModel: IMAGE_GENERATION_MODELS.find(
            (item) => item.id === imageModel,
          )?.label,
          tone,
          style: STYLE_PRESETS.find((item) => item.id === style)?.label,
          variations: variationCount,
        },
        ...prev,
      ]);
    } catch (err) {
      const friendlyError = buildFriendlyError(err);
      setError(friendlyError.message || "Failed to generate images");
      setSetupHint(friendlyError.steps.length > 0 ? friendlyError : null);
    } finally {
      setLoadingAction("");
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(approvedPrompt || enhancedPrompt);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const resetWorkspace = () => {
    setUserPrompt("");
    setEnhancedPrompt("");
    setApprovedPrompt("");
    setGeneratedImages([]);
    setError("");
    setSetupHint(null);
    setHistoryQuery("");
  };

  const restoreHistoryItem = (item) => {
    setUserPrompt(item.source || item.result || "");
    setEnhancedPrompt(item.result || "");
    setApprovedPrompt(item.result || "");
    setGeneratedImages([]);
    setTone(item.tone || "creative");
    setStyle(
      STYLE_PRESETS.find((preset) => preset.label === item.style)?.id ||
        STYLE_PRESETS[0].id,
    );
    setVariationCount(item.variations || 2);
  };

  const activeStep = approvedPrompt
    ? generatedImages.length
      ? 4
      : 3
    : enhancedPrompt
      ? 2
      : 1;

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "creative-studio-history.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`app ${appTheme}`}>
      <header className="header">
        <div>
          <h2>Text To Image Workflow</h2>
          <p className="subhead">
            Text Enhance → Approval → Image Generation
          </p>
        </div>
        <button
          className="btn secondary"
          onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")}
        >
          {appTheme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
      </header>

      <div className="stats-grid">
        {stats.map((item) => (
          <div key={item.label} className="stat-card">
            <span className="stat-card__label">{item.label}</span>
            <strong className="stat-card__value">{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="page-sections">
        <a href="#text-workflow" className="page-section page-section--active">
          Workflow Page
        </a>
        <a href="#text-results" className="page-section">
          Results Page
        </a>
        <a href="#text-history" className="page-section">
          History Page
        </a>
      </div>

      <div className="steps">
        <span className={activeStep >= 1 ? "active" : ""}>1. Input</span>
        <span className={activeStep >= 2 ? "active" : ""}>2. Enhance</span>
        <span className={activeStep >= 3 ? "active" : ""}>3. Approve</span>
        <span className={activeStep >= 4 ? "active" : ""}>4. Generate</span>
      </div>

      <div id="text-workflow" className="grid">
        <div className="card">
          <h3>Workflow Controls</h3>

          <input
            type="text"
            className="input"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Enter your idea..."
          />

          <div className="settings-grid">
            <label className="field">
              <span>Prompt Model</span>
              <select
                className="input select-input"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {TEXT_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} · {model.speed}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Prompt Tone</span>
              <select
                className="input select-input"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="creative">Creative</option>
                <option value="cinematic">Cinematic</option>
                <option value="commercial">Commercial</option>
                <option value="minimal">Minimal</option>
              </select>
            </label>
          </div>

          <div className="settings-grid">
            <label className="field">
              <span>Image Model</span>
              <select
                className="input select-input"
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
              >
                {IMAGE_GENERATION_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} · {model.quality}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Visual Style</span>
              <select
                className="input select-input"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                {STYLE_PRESETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Variations</span>
              <select
                className="input select-input"
                value={variationCount}
                onChange={(e) => setVariationCount(Number(e.target.value))}
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count} image{count > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="templates">
            {templates.map((t, i) => (
              <button key={i} className="chip" onClick={() => setUserPrompt(t)}>
                {t}
              </button>
            ))}
          </div>

          <div className="action-row">
            <button className="btn primary" onClick={handleEnhance}>
              Enhance Prompt
            </button>
            <button
              className="btn secondary"
              onClick={handleApprove}
              disabled={!enhancedPrompt || isLoading}
            >
              Approve Prompt
            </button>
            <button
              className="btn primary"
              onClick={handleGenerateImages}
              disabled={!approvedPrompt || isLoading}
            >
              Generate Images
            </button>
            <button className="btn secondary" onClick={resetWorkspace}>
              Reset Workspace
            </button>
          </div>

          {error && (
            <div className="error-panel">
              <p className="error">{error}</p>
              {setupHint && (
                <div className="setup-hint">
                  <h4>{setupHint.title}</h4>
                  {setupHint.steps.map((step) => (
                    <p key={step}>{step}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Results Section</h3>

          {enhancedPrompt ? (
            <>
              <div className="result-block">
                <p className="label">Original Text</p>
                <p>{userPrompt}</p>
              </div>

              <div className="result-block">
                <p className="label">Enhanced Text</p>
                <textarea
                  className="textarea"
                  value={enhancedPrompt}
                  onChange={(e) => setEnhancedPrompt(e.target.value)}
                />
              </div>

              <div className="result-block approval-box">
                <p className="label">Approval Status</p>
                <p>{approvedPrompt ? "Approved for image generation" : "Waiting for approval"}</p>
                {approvedPrompt && <p className="approved-text">{approvedPrompt}</p>}
              </div>

              <p className="meta-text">
                Model:{" "}
                {TEXT_MODELS.find((item) => item.id === selectedModel)?.label} |
                Tone: {tone} |{" "}
                {enhancedPrompt.split(/\s+/).filter(Boolean).length} words
              </p>

              <div className="action-row">
                <button className="btn primary" onClick={copyPrompt}>
                  Copy Prompt
                </button>
              </div>
            </>
          ) : (
            <p className="placeholder">
              Your enhanced text and approved prompt will appear here.
            </p>
          )}
        </div>
      </div>

      {generatedImages.length > 0 && (
        <div id="text-results" className="results-panel">
          <div className="results-header">
            <div>
              <h3>Generated Images</h3>
              <p className="subhead">
                Showing {generatedImages.length} variation
                {generatedImages.length > 1 ? "s" : ""} from the approved prompt
              </p>
            </div>
          </div>

          <div className="results-grid">
            {generatedImages.map((item, index) => (
              <div key={`${item.imageUrl}-${index}`} className="result-card">
                <img
                  src={item.imageUrl}
                  alt={`Generated variation ${index + 1}`}
                  className="result-image"
                />
                <p className="result-caption">
                  Variation {index + 1} ·{" "}
                  {IMAGE_GENERATION_MODELS.find(
                    (model) => model.id === item.model,
                  )?.label ||
                    item.providerModel ||
                    item.model}
                  {item.provider === "google-gemini"
                    ? " via Gemini fallback"
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="text-history" className="history">
        <div className="history-header">
          <h3>Workflow History</h3>
          <div className="history-toolbar">
            <input
              type="text"
              className="input history-search"
              placeholder="Search history..."
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
            />
            <button className="btn secondary" onClick={exportHistory}>
              Export
            </button>
            <button className="btn secondary" onClick={clearHistory}>
              Clear
            </button>
          </div>
        </div>

        {filteredHistory.map((item) => (
          <div key={item.id} className="history-item">
            <p className="history-meta">
              {item.textModel} · {item.imageModel}
            </p>
            <p>{item.result}</p>
            <p className="history-detail">
              Tone: {item.tone} | Style: {item.style} | Variations:{" "}
              {item.variations}
            </p>
            <div className="history-actions">
              <button
                className="btn secondary"
                onClick={() => restoreHistoryItem(item)}
              >
                Reopen This Version
              </button>
              <button
                className="btn secondary"
                onClick={() => navigator.clipboard.writeText(item.result || "")}
              >
                Copy Entry
              </button>
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="page-loader">
          <div className="page-loader__orb"></div>
          <div className="page-loader__orb page-loader__orb--delay"></div>
          <div className="page-loader__panel">
            <div className="page-loader__spinner"></div>
            <h3>Processing Request</h3>
            <p>{loadingAction}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkflowPrompt;
