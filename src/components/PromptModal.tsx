import { useState, useEffect, useCallback } from "react";
import "./PromptModal.css";

interface PromptModalProps {
  prompt: string;
  onClose: () => void;
  claudeCodeMode?: boolean;
  isConnected?: boolean;
}

export function PromptModal({ prompt, onClose, claudeCodeMode, isConnected = true }: PromptModalProps) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [prompt]);

  const handleSendToClaude = useCallback(async () => {
    setSending(true);
    try {
      const res = await fetch("/api/send-to-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        setSent(true);
      }
    } catch (err) {
      console.error("Failed to send to Claude:", err);
    } finally {
      setSending(false);
    }
  }, [prompt]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (sent) {
    return (
      <div className="prompt-modal-backdrop">
        <div className="prompt-modal prompt-modal-sent">
          <div className="sent-message">
            <svg width="48" height="48" viewBox="0 0 16 16" fill="#2da44e">
              <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z" />
            </svg>
            <h2>Prompt sent to Claude Code</h2>
            <p>You can close this tab now.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="prompt-modal-backdrop" onClick={handleBackdropClick}>
      <div className="prompt-modal">
        <div className="prompt-modal-header">
          <h2>Generated Prompt</h2>
          <button className="prompt-modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>
        <div className="prompt-modal-content">
          <pre className="prompt-text">{prompt}</pre>
        </div>
        <div className="prompt-modal-footer">
          {claudeCodeMode ? (
            <>
              <button className="btn-secondary" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
              <button
                className="btn-primary"
                onClick={handleSendToClaude}
                disabled={sending || !isConnected}
                title={!isConnected ? "Cannot send while disconnected from server" : undefined}
              >
                {sending ? "Sending..." : "Send to Claude Code"}
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
