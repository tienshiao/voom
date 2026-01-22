import type { LineComment } from "../types/diff";
import "./Comment.css";

interface CommentDisplayProps {
  comment: LineComment;
  commentKey: string;
  onEdit: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  isDeleteConfirm: boolean;
  variant?: "line" | "file";
}

export function CommentDisplay({
  comment,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  isDeleteConfirm,
  variant = "line",
}: CommentDisplayProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const inner = (
    <div className="comment-container">
      <div className="comment-header">
        <span className="comment-meta">
          {comment.updatedAt !== comment.createdAt ? "edited " : ""}
          {formatTime(comment.updatedAt)}
        </span>
        <div className="comment-controls">
          <button className="comment-btn" onClick={onEdit}>
            Edit
          </button>
          <button className="comment-btn comment-btn-delete" onClick={onRequestDelete}>
            Delete
          </button>
        </div>
      </div>
      {isDeleteConfirm && (
        <div className="delete-confirm">
          <span>Delete this comment?</span>
          <button className="btn-confirm-delete" onClick={onConfirmDelete}>
            Delete
          </button>
          <button className="btn-cancel-delete" onClick={onCancelDelete}>
            Cancel
          </button>
        </div>
      )}
      <div className="comment-body">{comment.content}</div>
    </div>
  );

  if (variant === "file") {
    return <div className="file-comment-display-wrapper">{inner}</div>;
  }

  return (
    <tr className="comment-display-row">
      <td colSpan={3} className="comment-display-cell">
        {inner}
      </td>
    </tr>
  );
}
