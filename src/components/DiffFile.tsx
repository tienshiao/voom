import React from "react";
import { ChevronDown, ChevronRight, ChevronUp, MoreHorizontal } from "lucide-react";
import type { FileDiff, DiffHunk, HunkExpansionState, DiffLine } from "../types/diff";

interface DiffFileProps {
  file: FileDiff;
  isExpanded: boolean;
  onToggle: () => void;
  hunkExpansions: Map<string, HunkExpansionState>;
  onExpandContext: (
    filePath: string,
    hunkIndex: number,
    direction: "before" | "after",
    hunk: DiffHunk,
    prevHunk: DiffHunk | null,
    nextHunk: DiffHunk | null
  ) => void;
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

function ContextLine({ line }: { line: DiffLine }) {
  return (
    <tr className="diff-line diff-line-context expanded-context">
      <td className="line-num line-num-old">{line.oldLineNum ?? ""}</td>
      <td className="line-num line-num-new">{line.newLineNum ?? ""}</td>
      <td className="line-content">
        <span className="line-prefix"> </span>
        <span className="line-text">{line.content}</span>
      </td>
    </tr>
  );
}

export function DiffFile({
  file,
  isExpanded,
  onToggle,
  hunkExpansions,
  onExpandContext,
}: DiffFileProps) {
  const total = file.additions + file.deletions;
  const additionWidth = total > 0 ? (file.additions / total) * 100 : 0;

  // Use newPath for file reading (handles new files from /dev/null)
  const filePath = file.newPath;

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
    <div className="diff-file">
      <div className="diff-file-header" onClick={onToggle}>
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
      </div>
      {isExpanded && (
        <div className="diff-content">
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
                    {expansion?.beforeLines.map((line, lineIdx) => (
                      <ContextLine key={`before-${hunkIdx}-${lineIdx}`} line={line} />
                    ))}

                    {/* Hunk header and lines */}
                    {hunk.lines.map((line, lineIdx) => (
                      <tr
                        key={`${hunkIdx}-${lineIdx}`}
                        className={`diff-line diff-line-${line.type}`}
                      >
                        {line.type === "hunk-header" ? (
                          <>
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
                          </>
                        ) : (
                          <>
                            <td className="line-num line-num-old">
                              {line.oldLineNum ?? ""}
                            </td>
                            <td className="line-num line-num-new">
                              {line.newLineNum ?? ""}
                            </td>
                            <td className="line-content">
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
                          </>
                        )}
                      </tr>
                    ))}

                    {/* Expanded context lines after hunk */}
                    {expansion?.afterLines.map((line, lineIdx) => (
                      <ContextLine key={`after-${hunkIdx}-${lineIdx}`} line={line} />
                    ))}

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
        </div>
      )}
    </div>
  );
}
