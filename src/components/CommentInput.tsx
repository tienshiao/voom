import { useState, useEffect, useRef } from "react";

interface CommentInputProps {
  initialContent?: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export function CommentInput({ initialContent, onSave, onCancel }: CommentInputProps) {
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

  return (
    <tr className="comment-input-row">
      <td colSpan={3} className="comment-input-cell">
        <div className="comment-input-container">
          <textarea
            ref={textareaRef}
            className="comment-textarea"
            placeholder="Leave a comment..."
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
      </td>
    </tr>
  );
}
