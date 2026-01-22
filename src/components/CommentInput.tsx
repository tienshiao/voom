import { useState, useEffect, useRef } from "react";
import "./Comment.css";

interface CommentInputProps {
  initialContent?: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  variant?: "line" | "file";
}

export function CommentInput({ initialContent, onSave, onCancel, variant = "line" }: CommentInputProps) {
  const [content, setContent] = useState(initialContent || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      if (content.trim()) {
        onSave(content);
      }
    }
  };

  const inner = (
    <div className="comment-input-container">
      <textarea
        ref={textareaRef}
        className="comment-textarea"
        placeholder={variant === "file" ? "Leave a comment on this file..." : "Leave a comment..."}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />
      <div className="comment-actions">
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-commit"
          onClick={() => onSave(content)}
          disabled={!content.trim()}
        >
          Add comment
        </button>
      </div>
    </div>
  );

  if (variant === "file") {
    return <div className="file-comment-input-wrapper">{inner}</div>;
  }

  return (
    <tr className="comment-input-row">
      <td colSpan={3} className="comment-input-cell">
        {inner}
      </td>
    </tr>
  );
}
