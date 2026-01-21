import { useState, useEffect, useRef } from "react";
import "./index.css";

interface DiffResponse {
  diff: string;
  directory: string;
}

interface DiffLine {
  type: "context" | "addition" | "deletion" | "hunk-header";
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

interface FileDiff {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

function parseDiff(diffText: string): FileDiff[] {
  const files: FileDiff[] = [];
  const lines = diffText.split("\n");
  let currentFile: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // New file diff header
    if (line.startsWith("diff --git")) {
      if (currentFile) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }
        files.push(currentFile);
      }
      currentFile = {
        oldPath: "",
        newPath: "",
        hunks: [],
        additions: 0,
        deletions: 0,
      };
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    // Old file path
    if (line.startsWith("--- ")) {
      currentFile.oldPath = line.slice(4).replace(/^a\//, "");
      continue;
    }

    // New file path
    if (line.startsWith("+++ ")) {
      currentFile.newPath = line.slice(4).replace(/^b\//, "");
      continue;
    }

    // Hunk header
    const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)$/);
    if (hunkMatch) {
      if (currentHunk) {
        currentFile.hunks.push(currentHunk);
      }
      oldLineNum = parseInt(hunkMatch[1], 10);
      newLineNum = parseInt(hunkMatch[3], 10);
      currentHunk = {
        header: line,
        oldStart: oldLineNum,
        oldCount: parseInt(hunkMatch[2] || "1", 10),
        newStart: newLineNum,
        newCount: parseInt(hunkMatch[4] || "1", 10),
        lines: [],
      };
      currentHunk.lines.push({
        type: "hunk-header",
        content: hunkMatch[5] || "",
      });
      continue;
    }

    if (!currentHunk) continue;

    // Diff lines
    if (line.startsWith("+")) {
      currentHunk.lines.push({
        type: "addition",
        content: line.slice(1),
        newLineNum: newLineNum++,
      });
      currentFile.additions++;
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({
        type: "deletion",
        content: line.slice(1),
        oldLineNum: oldLineNum++,
      });
      currentFile.deletions++;
    } else if (line.startsWith(" ") || line === "") {
      currentHunk.lines.push({
        type: "context",
        content: line.slice(1),
        oldLineNum: oldLineNum++,
        newLineNum: newLineNum++,
      });
    }
  }

  // Push last file and hunk
  if (currentFile) {
    if (currentHunk) {
      currentFile.hunks.push(currentHunk);
    }
    files.push(currentFile);
  }

  return files;
}

function FileTree({
  files,
  selectedFile,
  onSelectFile,
}: {
  files: FileDiff[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}) {
  const buildTree = (files: FileDiff[]) => {
    const tree: Record<string, any> = {};
    files.forEach((file) => {
      const parts = file.newPath.split("/");
      let current = tree;
      parts.forEach((part, idx) => {
        if (!current[part]) {
          current[part] = idx === parts.length - 1 ? { __file: file } : {};
        }
        current = current[part];
      });
    });
    return tree;
  };

  const renderTree = (
    node: Record<string, any>,
    path: string = "",
    depth: number = 0
  ) => {
    return Object.entries(node).map(([key, value]) => {
      if (key === "__file") return null;
      const fullPath = path ? `${path}/${key}` : key;
      const isFile = value.__file;
      const file = value.__file as FileDiff | undefined;

      return (
        <div key={fullPath}>
          <div
            className={`tree-item ${isFile ? "tree-file" : "tree-folder"} ${
              selectedFile === file?.newPath ? "selected" : ""
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => isFile && onSelectFile(file!.newPath)}
          >
            <span className="tree-icon">{isFile ? "📄" : "📁"}</span>
            <span className="tree-name">{key}</span>
            {isFile && file && (
              <span className="tree-stats">
                <span className="stat-add">+{file.additions}</span>
                <span className="stat-del">-{file.deletions}</span>
              </span>
            )}
          </div>
          {!isFile && renderTree(value, fullPath, depth + 1)}
        </div>
      );
    });
  };

  const tree = buildTree(files);
  return <div className="file-tree">{renderTree(tree)}</div>;
}

function DiffFile({
  file,
  isExpanded,
  onToggle,
}: {
  file: FileDiff;
  isExpanded: boolean;
  onToggle: () => void;
}) {
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

export function App() {
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingToFile = useRef(false);

  useEffect(() => {
    fetchDiff();
  }, []);

  useEffect(() => {
    if (files.length === 0 || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToFile.current) return;

        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleEntries.length > 0) {
          const topEntry = visibleEntries[0];
          const path = topEntry.target.getAttribute("data-file-path");
          if (path) {
            setSelectedFile(path);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "-57px 0px 0px 0px",
        threshold: 0,
      }
    );

    files.forEach((file) => {
      const element = document.getElementById(
        `file-${file.newPath.replace(/\//g, "-")}`
      );
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [files]);

  const fetchDiff = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/diff");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch diff");
      }

      setDiffData(data);
      const parsed = parseDiff(data.diff);
      setFiles(parsed);
      // Expand all files by default
      setExpandedFiles(new Set(parsed.map((f) => f.newPath)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const scrollToFile = (path: string) => {
    isScrollingToFile.current = true;
    setSelectedFile(path);
    setExpandedFiles((prev) => new Set(prev).add(path));
    const element = document.getElementById(`file-${path.replace(/\//g, "-")}`);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      isScrollingToFile.current = false;
    }, 500);
  };

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  if (loading) {
    return (
      <div className="diff-viewer">
        <div className="loading">Loading diff...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diff-viewer">
        <div className="error">
          <h2>Error loading diff</h2>
          <p>{error}</p>
          <button onClick={fetchDiff}>Retry</button>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="diff-viewer">
        <div className="empty-state">
          <h2>No changes detected</h2>
          <p>There are no uncommitted changes in the repository.</p>
          {diffData?.directory && (
            <p className="directory-info">Directory: {diffData.directory}</p>
          )}
          <button onClick={fetchDiff}>Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <div className="diff-viewer">
      <div className="diff-sidebar">
        <div className="sidebar-header">
          <span className="files-count">
            {files.length} file{files.length !== 1 ? "s" : ""} changed
          </span>
          <span className="total-stats">
            <span className="stat-add">+{totalAdditions}</span>
            <span className="stat-del">-{totalDeletions}</span>
          </span>
        </div>
        <FileTree
          files={files}
          selectedFile={selectedFile}
          onSelectFile={scrollToFile}
        />
      </div>
      <div className="diff-main" ref={scrollContainerRef}>
        <div className="diff-header">
          <h1>Code Review</h1>
          {diffData?.directory && (
            <span className="directory-badge">{diffData.directory}</span>
          )}
          <button className="refresh-btn" onClick={fetchDiff}>
            Refresh
          </button>
        </div>
        <div className="diff-files">
          {files.map((file) => (
            <div
              key={file.newPath}
              id={`file-${file.newPath.replace(/\//g, "-")}`}
              data-file-path={file.newPath}
            >
              <DiffFile
                file={file}
                isExpanded={expandedFiles.has(file.newPath)}
                onToggle={() => toggleFile(file.newPath)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
