import React from "react";
import { Check, ChevronDown, ChevronRight, ChevronUp, MessageSquare, MoreHorizontal, Plus, Square } from "lucide-react";
import { CommentInput } from "./CommentInput";
import { CommentDisplay } from "./CommentDisplay";
import { ImageDiff } from "./ImageDiff";
import type { FileDiff, DiffHunk, HunkExpansionState, DiffLine, LineComment } from "../types/diff";
import type { UseCommentsReturn } from "../hooks/useComments";
import "./DiffFile.css";

interface DiffFileProps {
  file: FileDiff;
  isExpanded: boolean;
  isViewed: boolean;
  onToggle: () => void;
  onToggleViewed: () => void;
  hunkExpansions: Map<string, HunkExpansionState>;
  onExpandContext: (
    filePath: string,
    hunkIndex: number,
    direction: "before" | "after",
    hunk: DiffHunk,
    prevHunk: DiffHunk | null,
    nextHunk: DiffHunk | null
  ) => void;
  commentState: UseCommentsReturn;
}

function ExpandButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "before" | "after";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <tr
      className="expand-row"
      onClick={disabled ? undefined : onClick}
      title={direction === "before" ? "Load previous lines" : "Load next lines"}
    >
      <td className="line-num expand-line-num" colSpan={2}>
        <span className="expand-icon-wrapper">
          {direction === "before" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </td>
      <td className="line-content expand-content">
        <span className="expand-dots">...</span>
      </td>
    </tr>
  );
}

interface ContextLineProps {
  line: DiffLine;
  filePath: string;
  hunkIndex: number;
  commentKey: string;
  comment?: LineComment;
  isActive: boolean;
  isEditing: boolean;
  isDeleteConfirm: boolean;
  onOpenComment: () => void;
  onSaveComment: (content: string) => void;
  onCancelComment: () => void;
  onEditComment: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function ContextLine({
  line,
  commentKey,
  comment,
  isActive,
  isEditing,
  isDeleteConfirm,
  onOpenComment,
  onSaveComment,
  onCancelComment,
  onEditComment,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: ContextLineProps) {
  return (
    <>
      <tr className="diff-line diff-line-context expanded-context">
        <td className="line-num line-num-old">
          {line.oldLineNum ?? ""}
        </td>
        <td className="line-num line-num-new">{line.newLineNum ?? ""}</td>
        <td className="line-content">
          <button
            className="add-comment-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenComment();
            }}
            title="Add comment"
          >
            <Plus size={14} />
          </button>
          <span className="line-prefix"> </span>
          <span className="line-text">{line.content}</span>
        </td>
      </tr>
      {comment && !isActive && (
        <CommentDisplay
          comment={comment}
          commentKey={commentKey}
          onEdit={onEditComment}
          onRequestDelete={onRequestDelete}
          onConfirmDelete={onConfirmDelete}
          onCancelDelete={onCancelDelete}
          isDeleteConfirm={isDeleteConfirm}
        />
      )}
      {isActive && (
        <CommentInput
          initialContent={isEditing ? comment?.content : undefined}
          onSave={onSaveComment}
          onCancel={onCancelComment}
        />
      )}
    </>
  );
}

export function DiffFile({
  file,
  isExpanded,
  isViewed,
  onToggle,
  onToggleViewed,
  hunkExpansions,
  onExpandContext,
  commentState,
}: DiffFileProps) {
  const {
    comments,
    activeCommentLines,
    editingCommentId,
    deleteConfirmId,
    getFileCommentKey,
    openComment,
    openFileComment,
    saveComment,
    saveFileComment,
    cancelComment,
    editComment,
    requestDelete,
    confirmDelete,
    cancelDelete,
  } = commentState;

  const total = file.additions + file.deletions;
  const additionWidth = total > 0 ? (file.additions / total) * 100 : 0;

  // Use newPath for file reading (handles new files from /dev/null)
  const filePath = file.newPath;

  const getCommentKey = (lineNumber: number, lineType: string) => {
    return `${filePath}:${lineNumber}:${lineType}`;
  };

  const shouldShowExpandBefore = (hunkIndex: number, hunk: DiffHunk) => {
    const prevHunk = hunkIndex > 0 ? file.hunks[hunkIndex - 1] : null;
    const expansionKey = `${filePath}:${hunkIndex}`;
    const expansion = hunkExpansions.get(expansionKey);

    // First hunk starting at line 1: don't show expand before
    if (!prevHunk && hunk.newStart <= 1) {
      return false;
    }

    // Calculate the effective start line of this hunk (including loaded before lines)
    const loadedBeforeCount = expansion?.beforeLines.length || 0;
    const effectiveStart = hunk.newStart - loadedBeforeCount;

    // Check if there's a gap between previous hunk and this one
    if (prevHunk) {
      const prevExpansionKey = `${filePath}:${hunkIndex - 1}`;
      const prevExpansion = hunkExpansions.get(prevExpansionKey);
      const prevLoadedAfterCount = prevExpansion?.afterLines.length || 0;
      const prevHunkEnd = prevHunk.newStart + prevHunk.newCount - 1;
      const prevEffectiveEnd = prevHunkEnd + prevLoadedAfterCount;

      // No gap if effective ranges meet or overlap
      if (effectiveStart <= prevEffectiveEnd + 1) {
        return false;
      }
    } else {
      // No previous hunk - check if we've reached line 1
      if (effectiveStart <= 1) {
        return false;
      }
    }

    // Check canExpandBefore from expansion state
    if (expansion && !expansion.canExpandBefore) {
      return false;
    }

    return true;
  };

  const shouldShowExpandAfter = (hunkIndex: number, hunk: DiffHunk) => {
    const nextHunk = hunkIndex < file.hunks.length - 1 ? file.hunks[hunkIndex + 1] : null;
    const expansionKey = `${filePath}:${hunkIndex}`;
    const expansion = hunkExpansions.get(expansionKey);

    // Calculate the effective end line of this hunk (including loaded after lines)
    const loadedAfterCount = expansion?.afterLines.length || 0;
    const hunkEnd = hunk.newStart + hunk.newCount - 1;
    const effectiveEnd = hunkEnd + loadedAfterCount;

    // Check if there's a gap between this hunk and next one
    if (nextHunk) {
      const nextExpansionKey = `${filePath}:${hunkIndex + 1}`;
      const nextExpansion = hunkExpansions.get(nextExpansionKey);
      const nextLoadedBeforeCount = nextExpansion?.beforeLines.length || 0;
      const nextEffectiveStart = nextHunk.newStart - nextLoadedBeforeCount;

      // No gap if effective ranges meet or overlap
      if (effectiveEnd + 1 >= nextEffectiveStart) {
        return false;
      }
    }

    // Check canExpandAfter from expansion state
    if (expansion && !expansion.canExpandAfter) {
      return false;
    }

    return true;
  };

  return (
    <div className={`diff-file ${!isExpanded ? 'diff-file-collapsed' : ''}`}>
      <div className="diff-file-header" onClick={onToggle}>
        <span className="header-gap-cover" />
        <span className="expand-icon">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="change-indicator">
          <span
            className="change-bar addition-bar"
            style={{ width: `${additionWidth}%` }}
          />
          <span
            className="change-bar deletion-bar"
            style={{ width: `${100 - additionWidth}%` }}
          />
        </span>
        <span className="file-path">{file.newPath}</span>
        <span className="file-stats">
          <span className="stat-add">+{file.additions}</span>
          <span className="stat-del">-{file.deletions}</span>
        </span>
        <button
          className={`viewed-checkbox ${isViewed ? 'viewed-checkbox-checked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleViewed();
          }}
          title={isViewed ? "Mark as not viewed" : "Mark as viewed"}
        >
          {isViewed ? <Check size={12} /> : <Square size={12} />}
          Viewed
        </button>
        <button
          className="add-file-comment-btn"
          onClick={(e) => {
            e.stopPropagation();
            openFileComment(filePath);
          }}
          title="Add comment on file"
        >
          <MessageSquare size={12} />
          Comment
        </button>
      </div>
      {isExpanded && (() => {
        const fileCommentKey = getFileCommentKey(filePath);
        const fileComment = comments.get(fileCommentKey);
        const isFileCommentActive = activeCommentLines.has(fileCommentKey);
        const isFileCommentEditing = isFileCommentActive && editingCommentId !== null;
        const isFileCommentDeleteConfirm = fileComment && deleteConfirmId === fileComment.id;

        if (!fileComment && !isFileCommentActive) return null;

        return (
          <div className="file-comment-section">
            {fileComment && !isFileCommentActive && (
              <CommentDisplay
                comment={fileComment}
                commentKey={fileCommentKey}
                onEdit={() => editComment(fileCommentKey)}
                onRequestDelete={() => requestDelete(fileComment.id)}
                onConfirmDelete={() => confirmDelete(fileCommentKey)}
                onCancelDelete={cancelDelete}
                isDeleteConfirm={!!isFileCommentDeleteConfirm}
                variant="file"
              />
            )}
            {isFileCommentActive && (
              <CommentInput
                initialContent={isFileCommentEditing ? fileComment?.content : undefined}
                onSave={(content) => saveFileComment(filePath, content)}
                onCancel={() => cancelComment(fileCommentKey)}
                variant="file"
              />
            )}
          </div>
        );
      })()}
      {isExpanded && file.isImage && (
        <div className="diff-content">
          <ImageDiff file={file} />
        </div>
      )}
      {isExpanded && !file.isImage && (
        <div className="diff-content">
          {file.hunks.length === 0 ? (
            <div className="empty-file-indicator">Empty file</div>
          ) : (
          <table className="diff-table">
            <tbody>
              {file.hunks.map((hunk, hunkIdx) => {
                const prevHunk: DiffHunk | null = hunkIdx > 0 ? file.hunks[hunkIdx - 1]! : null;
                const nextHunk: DiffHunk | null = hunkIdx < file.hunks.length - 1 ? file.hunks[hunkIdx + 1]! : null;
                const expansionKey = `${filePath}:${hunkIdx}`;
                const expansion = hunkExpansions.get(expansionKey);

                const showExpandBefore = shouldShowExpandBefore(hunkIdx, hunk);
                const showExpandAfter = shouldShowExpandAfter(hunkIdx, hunk);

                return (
                  <React.Fragment key={hunkIdx}>
                    {/* Expand before button */}
                    {showExpandBefore && (
                      <ExpandButton
                        direction="before"
                        onClick={() => onExpandContext(filePath, hunkIdx, "before", hunk, prevHunk, nextHunk)}
                      />
                    )}

                    {/* Expanded context lines before hunk */}
                    {expansion?.beforeLines.map((line, lineIdx) => {
                      const lineNum = line.newLineNum!;
                      const commentKey = getCommentKey(lineNum, "context");
                      const comment = comments.get(commentKey);
                      const isActive = activeCommentLines.has(commentKey);
                      const isEditing = isActive && editingCommentId !== null;
                      const isDeleteConfirm = comment && deleteConfirmId === comment.id;

                      return (
                        <ContextLine
                          key={`before-${hunkIdx}-${lineIdx}`}
                          line={line}
                          filePath={filePath}
                          hunkIndex={hunkIdx}
                          commentKey={commentKey}
                          comment={comment}
                          isActive={isActive}
                          isEditing={isEditing}
                          isDeleteConfirm={!!isDeleteConfirm}
                          onOpenComment={() => openComment(filePath, lineNum, "context")}
                          onSaveComment={(content) => saveComment(filePath, lineNum, "context", hunkIdx, content)}
                          onCancelComment={() => cancelComment(commentKey)}
                          onEditComment={() => editComment(commentKey)}
                          onRequestDelete={() => comment && requestDelete(comment.id)}
                          onConfirmDelete={() => confirmDelete(commentKey)}
                          onCancelDelete={cancelDelete}
                        />
                      );
                    })}

                    {/* Hunk header and lines */}
                    {hunk.lines.map((line, lineIdx) => {
                      if (line.type === "hunk-header") {
                        return (
                          <tr
                            key={`${hunkIdx}-${lineIdx}`}
                            className="diff-line diff-line-hunk-header"
                          >
                            <td className="line-num hunk-line-num" colSpan={2}>
                              <span className="hunk-expand"><MoreHorizontal size={14} /></span>
                            </td>
                            <td className="line-content hunk-content">
                              <span className="hunk-range">
                                @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},
                                {hunk.newCount} @@
                              </span>
                              <span className="hunk-context">{line.content}</span>
                            </td>
                          </tr>
                        );
                      }

                      // For actual diff lines (addition, deletion, context)
                      const lineType = line.type as 'addition' | 'deletion' | 'context';
                      const lineNum = line.newLineNum ?? line.oldLineNum;
                      const commentKey = lineNum ? getCommentKey(lineNum, lineType) : null;
                      const comment = commentKey ? comments.get(commentKey) : undefined;
                      const isActive = commentKey ? activeCommentLines.has(commentKey) : false;
                      const isEditing = isActive && editingCommentId !== null;
                      const isDeleteConfirm = comment && deleteConfirmId === comment.id;

                      return (
                        <React.Fragment key={`${hunkIdx}-${lineIdx}`}>
                          <tr className={`diff-line diff-line-${line.type}`}>
                            <td className="line-num line-num-old">
                              {line.oldLineNum ?? ""}
                            </td>
                            <td className="line-num line-num-new">
                              {line.newLineNum ?? ""}
                            </td>
                            <td className="line-content">
                              {lineNum && (
                                <button
                                  className="add-comment-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openComment(filePath, lineNum, lineType);
                                  }}
                                  title="Add comment"
                                >
                                  <Plus size={14} />
                                </button>
                              )}
                              <span className="line-prefix">
                                {line.type === "addition"
                                  ? "+"
                                  : line.type === "deletion"
                                    ? "-"
                                    : " "}
                              </span>
                              <span className="line-text">
                                {line.segments ? (
                                  line.segments.map((seg, i) => (
                                    <span
                                      key={i}
                                      className={
                                        seg.highlighted
                                          ? `word-highlight-${line.type}`
                                          : ""
                                      }
                                    >
                                      {seg.text}
                                    </span>
                                  ))
                                ) : (
                                  line.content
                                )}
                              </span>
                            </td>
                          </tr>
                          {comment && !isActive && commentKey && (
                            <CommentDisplay
                              comment={comment}
                              commentKey={commentKey}
                              onEdit={() => editComment(commentKey)}
                              onRequestDelete={() => requestDelete(comment.id)}
                              onConfirmDelete={() => confirmDelete(commentKey)}
                              onCancelDelete={cancelDelete}
                              isDeleteConfirm={!!isDeleteConfirm}
                            />
                          )}
                          {isActive && commentKey && lineNum && (
                            <CommentInput
                              initialContent={isEditing ? comment?.content : undefined}
                              onSave={(content) => saveComment(filePath, lineNum, lineType, hunkIdx, content)}
                              onCancel={() => cancelComment(commentKey)}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Expanded context lines after hunk */}
                    {expansion?.afterLines.map((line, lineIdx) => {
                      const lineNum = line.newLineNum!;
                      const commentKey = getCommentKey(lineNum, "context");
                      const comment = comments.get(commentKey);
                      const isActive = activeCommentLines.has(commentKey);
                      const isEditing = isActive && editingCommentId !== null;
                      const isDeleteConfirm = comment && deleteConfirmId === comment.id;

                      return (
                        <ContextLine
                          key={`after-${hunkIdx}-${lineIdx}`}
                          line={line}
                          filePath={filePath}
                          hunkIndex={hunkIdx}
                          commentKey={commentKey}
                          comment={comment}
                          isActive={isActive}
                          isEditing={isEditing}
                          isDeleteConfirm={!!isDeleteConfirm}
                          onOpenComment={() => openComment(filePath, lineNum, "context")}
                          onSaveComment={(content) => saveComment(filePath, lineNum, "context", hunkIdx, content)}
                          onCancelComment={() => cancelComment(commentKey)}
                          onEditComment={() => editComment(commentKey)}
                          onRequestDelete={() => comment && requestDelete(comment.id)}
                          onConfirmDelete={() => confirmDelete(commentKey)}
                          onCancelDelete={cancelDelete}
                        />
                      );
                    })}

                    {/* Expand after button */}
                    {showExpandAfter && (
                      <ExpandButton
                        direction="after"
                        onClick={() => onExpandContext(filePath, hunkIdx, "after", hunk, prevHunk, nextHunk)}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      )}
    </div>
  );
}
