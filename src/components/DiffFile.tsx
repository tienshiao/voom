import type { FileDiff } from "../types/diff";

interface DiffFileProps {
  file: FileDiff;
  isExpanded: boolean;
  onToggle: () => void;
}

export function DiffFile({ file, isExpanded, onToggle }: DiffFileProps) {
  const total = file.additions + file.deletions;
  const additionWidth = total > 0 ? (file.additions / total) * 100 : 0;

  return (
    <div className="diff-file">
      <div className="diff-file-header" onClick={onToggle}>
        <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
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
              {file.hunks.map((hunk, hunkIdx) =>
                hunk.lines.map((line, lineIdx) => (
                  <tr
                    key={`${hunkIdx}-${lineIdx}`}
                    className={`diff-line diff-line-${line.type}`}
                  >
                    {line.type === "hunk-header" ? (
                      <>
                        <td className="line-num hunk-line-num" colSpan={2}>
                          <span className="hunk-expand">⋯</span>
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
                          <span className="line-text">{line.content}</span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
