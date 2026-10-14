import React, { useState, useEffect } from "react";
import api from "../services/api.js";

export const ArtifactPanel = ({ artifact, onClose }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Reset selected file when active artifact changes
  useEffect(() => {
    setSelectedFileIndex(0);
  }, [artifact?._id, artifact?.identifier]);

  if (!artifact) return null;

  const isProject = artifact.type === "project" && artifact.files?.length > 0;
  const currentFile = isProject
    ? artifact.files[selectedFileIndex] || artifact.files[0]
    : null;

  const activeContent = isProject
    ? currentFile?.content || ""
    : artifact.content || "";

  const activeLanguage = isProject
    ? currentFile?.language || artifact.language || "javascript"
    : artifact.language || "javascript";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/artifacts/${artifact._id}/download`, {
        responseType: "blob",
      });

      const disposition = response.headers["content-disposition"];
      let filename = `${artifact.identifier}-v${artifact.version}.${isProject ? "zip" : "txt"}`;

      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download artifact. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <aside className="artifact-panel" aria-label="Artifact preview">
      {/* 1. Header */}
      <div className="artifact-panel-header">
        <div className="artifact-panel-title-group">
          <span className="artifact-badge">
            {isProject ? "Project" : activeLanguage}
          </span>
          <span className="artifact-version-badge">v{artifact.version}</span>
          <h3 className="artifact-panel-title">{artifact.title}</h3>
        </div>

        <div className="artifact-panel-actions">
          <button
            type="button"
            className="artifact-btn"
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>

          <button
            type="button"
            className="artifact-btn artifact-btn-primary"
            onClick={handleDownload}
            disabled={downloading}
            title={isProject ? "Download Project as ZIP" : "Download File"}
          >
            {downloading
              ? "Downloading..."
              : isProject
              ? "⬇ Download ZIP"
              : "⬇ Download"}
          </button>

          <button
            type="button"
            className="artifact-btn artifact-btn-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. File Tabs (for multi-file projects) */}
      {isProject && (
        <div className="artifact-file-tabs" role="tablist">
          {artifact.files.map((file, idx) => (
            <button
              key={file.path || idx}
              type="button"
              role="tab"
              aria-selected={selectedFileIndex === idx}
              className={`artifact-file-tab ${
                selectedFileIndex === idx ? "active" : ""
              }`}
              onClick={() => setSelectedFileIndex(idx)}
            >
              📄 {file.path}
            </button>
          ))}
        </div>
      )}

      {/* 3. Dependencies bar (if any) */}
      {artifact.dependencies?.length > 0 && (
        <div className="artifact-deps-bar">
          <span className="artifact-deps-label">Dependencies:</span>
          {artifact.dependencies.map((dep) => (
            <span key={dep} className="artifact-dep-tag">
              {dep}
            </span>
          ))}
        </div>
      )}

      {/* 4. Code Viewport */}
      <div className="artifact-code-viewport">
        <pre className="artifact-code-pre">
          <code>{activeContent}</code>
        </pre>
      </div>

      {/* 5. Execution / Test Result Footer (only if code was actually executed) */}
      {artifact.lastExecution && typeof artifact.lastExecution.success === "boolean" && (
        <div
          className={`artifact-exec-footer ${
            artifact.lastExecution.success ? "success" : "failure"
          }`}
        >
          <div className="artifact-exec-header">
            <span>
              {artifact.lastExecution.success
                ? "✓ Execution Succeeded"
                : `✕ Execution Failed (Exit code: ${artifact.lastExecution.exitCode ?? 1})`}
            </span>
            {artifact.lastExecution.ranAt && (
              <small>
                {new Date(artifact.lastExecution.ranAt).toLocaleTimeString()}
              </small>
            )}
          </div>
          {artifact.lastExecution.stdout && (
            <pre className="artifact-exec-log stdout">
              {artifact.lastExecution.stdout}
            </pre>
          )}
          {artifact.lastExecution.stderr && (
            <pre className="artifact-exec-log stderr">
              {artifact.lastExecution.stderr}
            </pre>
          )}
        </div>
      )}
    </aside>
  );
};

export default ArtifactPanel;
