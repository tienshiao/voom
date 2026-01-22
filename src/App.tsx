import { useState, useEffect, useRef } from "react";
import { FileTree } from "./components/FileTree";
import { DiffFile } from "./components/DiffFile";
import { parseDiff } from "./utils/parseDiff";
import { enhanceWithWordDiff } from "./utils/wordDiff";
import { useComments } from "./hooks/useComments";
import type { DiffResponse, FileDiff, DiffHunk, HunkExpansionState, DiffLine } from "./types/diff";
import "./index.css";

export function App() {
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [hunkExpansions, setHunkExpansions] = useState<Map<string, HunkExpansionState>>(new Map());
  const commentState = useComments();
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
      const enhanced = enhanceWithWordDiff(parsed);
      // Sort files by path to match tree rendering order
      enhanced.sort((a, b) => a.newPath.localeCompare(b.newPath));
      setFiles(enhanced);
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

  const expandHunkContext = async (
    filePath: string,
    hunkIndex: number,
    direction: "before" | "after",
    hunk: DiffHunk,
    prevHunk: DiffHunk | null,
    nextHunk: DiffHunk | null
  ) => {
    const expansionKey = `${filePath}:${hunkIndex}`;
    const currentExpansion = hunkExpansions.get(expansionKey) || {
      beforeLines: [],
      afterLines: [],
      canExpandBefore: true,
      canExpandAfter: true,
    };

    // Get adjacent hunk expansions
    const prevExpansionKey = `${filePath}:${hunkIndex - 1}`;
    const nextExpansionKey = `${filePath}:${hunkIndex + 1}`;
    const prevExpansion = hunkExpansions.get(prevExpansionKey);
    const nextExpansion = hunkExpansions.get(nextExpansionKey);

    const CONTEXT_LINES = 20;
    let startLine: number;
    let endLine: number;

    if (direction === "before") {
      // Calculate start line based on what's already loaded
      const loadedBeforeCount = currentExpansion.beforeLines.length;
      const hunkStartLine = hunk.newStart;

      // End is the line before the hunk (or before already loaded lines)
      endLine = hunkStartLine - 1 - loadedBeforeCount;

      // Start is CONTEXT_LINES before that
      startLine = endLine - CONTEXT_LINES + 1;

      // Don't go past file start
      if (startLine < 1) startLine = 1;

      // Don't overlap with previous hunk (including its expanded afterLines)
      if (prevHunk) {
        const prevHunkEnd = prevHunk.newStart + prevHunk.newCount - 1;
        const prevLoadedAfterCount = prevExpansion?.afterLines.length || 0;
        const prevEffectiveEnd = prevHunkEnd + prevLoadedAfterCount;
        if (startLine <= prevEffectiveEnd) {
          startLine = prevEffectiveEnd + 1;
        }
      }

      if (startLine > endLine) {
        // Nothing more to load
        setHunkExpansions((prev) => {
          const next = new Map(prev);
          next.set(expansionKey, { ...currentExpansion, canExpandBefore: false });
          return next;
        });
        return;
      }
    } else {
      // direction === "after"
      const loadedAfterCount = currentExpansion.afterLines.length;
      const hunkEndLine = hunk.newStart + hunk.newCount - 1;

      // Start is after the hunk (or after already loaded lines)
      startLine = hunkEndLine + 1 + loadedAfterCount;

      // End is CONTEXT_LINES after that
      endLine = startLine + CONTEXT_LINES - 1;

      // Don't overlap with next hunk (including its expanded beforeLines)
      if (nextHunk) {
        const nextLoadedBeforeCount = nextExpansion?.beforeLines.length || 0;
        const nextEffectiveStart = nextHunk.newStart - nextLoadedBeforeCount;
        if (endLine >= nextEffectiveStart) {
          endLine = nextEffectiveStart - 1;
        }
      }

      if (startLine > endLine) {
        // Nothing more to load
        setHunkExpansions((prev) => {
          const next = new Map(prev);
          next.set(expansionKey, { ...currentExpansion, canExpandAfter: false });
          return next;
        });
        return;
      }
    }

    try {
      const res = await fetch(
        `/api/context?file=${encodeURIComponent(filePath)}&start=${startLine}&end=${endLine}`
      );
      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to fetch context:", data.message);
        return;
      }

      const newLines: DiffLine[] = data.lines.map((line: { lineNum: number; content: string }) => ({
        type: "context" as const,
        content: line.content,
        oldLineNum: line.lineNum,
        newLineNum: line.lineNum,
      }));

      setHunkExpansions((prev) => {
        const next = new Map(prev);
        const existing = next.get(expansionKey) || {
          beforeLines: [],
          afterLines: [],
          canExpandBefore: true,
          canExpandAfter: true,
        };

        // Re-check adjacent expansions for accurate canExpand calculation
        const latestPrevExpansion = next.get(prevExpansionKey);
        const latestNextExpansion = next.get(nextExpansionKey);

        if (direction === "before") {
          const prevEffectiveEnd = prevHunk
            ? prevHunk.newStart + prevHunk.newCount - 1 + (latestPrevExpansion?.afterLines.length || 0)
            : 0;

          next.set(expansionKey, {
            ...existing,
            beforeLines: [...newLines, ...existing.beforeLines],
            canExpandBefore: startLine > 1 && startLine > prevEffectiveEnd + 1,
          });
        } else {
          const nextEffectiveStart = nextHunk
            ? nextHunk.newStart - (latestNextExpansion?.beforeLines.length || 0)
            : Infinity;

          next.set(expansionKey, {
            ...existing,
            afterLines: [...existing.afterLines, ...newLines],
            canExpandAfter: data.hasMore && endLine < nextEffectiveStart - 1,
          });
        }

        return next;
      });
    } catch (error) {
      console.error("Failed to expand context:", error);
    }
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
                hunkExpansions={hunkExpansions}
                onExpandContext={expandHunkContext}
                commentState={commentState}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
