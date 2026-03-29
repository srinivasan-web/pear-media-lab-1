import React from "react";

function ImageCard({ image, loading, error, originalPrompt, enhancedPrompt }) {
  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = image;
    link.download = "generated-image.png";
    link.click();
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(enhancedPrompt || originalPrompt || "");
    alert("Prompt copied!");
  };

  return (
    <div className="image-card-ui">
      <h3 className="image-card-ui__title">AI Generated Result</h3>

      {loading && <p className="image-card-ui__loading">Generating image...</p>}

      {error && <p className="image-card-ui__error">{error}</p>}

      {image && !loading && (
        <img src={image} alt="Generated" className="image-card-ui__image" />
      )}

      {image && (
        <div className="image-card-ui__actions">
          <button className="btn primary" onClick={downloadImage}>
            Download
          </button>

          <button className="btn secondary" onClick={copyPrompt}>
            Copy Prompt
          </button>
        </div>
      )}

      {(originalPrompt || enhancedPrompt) && (
        <div className="image-card-ui__compare">
          <h4>Prompt Comparison</h4>

          <div className="image-card-ui__compare-row">
            <div className="image-card-ui__compare-box">
              <p className="image-card-ui__label">Original</p>
              <p>{originalPrompt}</p>
            </div>

            <div className="image-card-ui__compare-box">
              <p className="image-card-ui__label">Enhanced</p>
              <p>{enhancedPrompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageCard;
