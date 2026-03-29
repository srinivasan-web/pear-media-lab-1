function Controls({
  onUpload,
  onAnalyze,
  onGenerate,
  loading,
  style,
  setStyle,
}) {
  const styles = ["Realistic", "Anime", "Cyberpunk", "Cartoon"];

  const handleFile = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onloadend = () => onUpload(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="controls glass-card slide-up">
      <input type="file" onChange={handleFile} />

      <select value={style} onChange={(e) => setStyle(e.target.value)}>
        {styles.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>

      <button className="btn primary" onClick={onAnalyze} disabled={loading}>
        Analyze
      </button>

      <button className="btn primary" onClick={onGenerate} disabled={loading}>
        Generate
      </button>
    </div>
  );
}

export default Controls;
