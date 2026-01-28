import { useState, useEffect, useRef } from "react";
import { FileTree } from "./components/FileTree";
import { DiffFile } from "./components/DiffFile";
import { PromptModal } from "./components/PromptModal";
import { parseDiff } from "./utils/parseDiff";
import { enhanceWithWordDiff } from "./utils/wordDiff";
import { generatePrompt } from "./utils/generatePrompt";
import { useComments } from "./hooks/useComments";
import { useResizableSidebar } from "./hooks/useResizableSidebar";
import { useTheme } from "./hooks/useTheme";
import { useServerConnection } from "./hooks/useServerConnection";
import type { DiffResponse, FileDiff, DiffHunk, HunkExpansionState, DiffLine } from "./types/diff";
import { Menu, PanelLeftClose, Sun, Moon } from "lucide-react";
import "./index.css";

export function App() {
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [hunkExpansions, setHunkExpansions] = useState<Map<string, HunkExpansionState>>(new Map());
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [claudeCodeMode, setClaudeCodeMode] = useState(false);
  const [noFeedbackSent, setNoFeedbackSent] = useState(false);
  const [diffHash, setDiffHash] = useState<string | null>(null);
  const commentState = useComments();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingToFile = useRef(false);
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');

  const {
    sidebarCollapsed,
    sidebarWidth,
    isMobile,
    crossingBreakpoint,
    sidebarRef,
    headerRef,
    navRef,
    handleResizeMouseDown,
    toggleSidebar,
    closeSidebar,
  } = useResizableSidebar();

  const { theme, resolvedTheme, cycleTheme } = useTheme();

  const { status: connectionStatus, isConnected } = useServerConnection(diffHash, {
    enabled: claudeCodeMode,
  });

  // Thresholds for auto-enabling single-file mode
  const FILE_COUNT_THRESHOLD = 30;
  const TOTAL_LINES_THRESHOLD = 1500;

  useEffect(() => {
    fetchDiff();
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setClaudeCodeMode(data.claudeCodeMode))
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Skip observer in single-file mode
    if (viewMode === 'single') return;
    if (files.length === 0 || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToFile.current) return;

        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const topEntry = visibleEntries[0];
        if (topEntry) {
          const path = topEntry.target.getAttribute("data-file-path");
          if (path) {
            setSelectedFile(path);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "0px 0px 0px 0px",
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
  }, [files, viewMode]);

  useEffect(() => {
    if (diffData?.directory) {
      document.title = `Voom - ${diffData.directory}`;
    } else {
      document.title = "Voom";
    }
  }, [diffData?.directory]);

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
      setDiffHash(data.hash);
      const parsed = parseDiff(data.diff);
      const enhanced = enhanceWithWordDiff(parsed);
      // Sort files by path to match tree rendering order
      enhanced.sort((a, b) => a.newPath.localeCompare(b.newPath));
      setFiles(enhanced);

      // Auto-enable single-file mode for large diffs
      const totalLines = enhanced.reduce((sum, f) => sum + f.additions + f.deletions, 0);
      const shouldAutoEnable = enhanced.length >= FILE_COUNT_THRESHOLD || totalLines >= TOTAL_LINES_THRESHOLD;

      if (shouldAutoEnable && enhanced[0]) {
        setViewMode('single');
        setSelectedFile(enhanced[0].newPath);
        setExpandedFiles(new Set([enhanced[0].newPath]));
      } else {
        setExpandedFiles(new Set(parsed.map((f) => f.newPath)));
      }
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

  const toggleViewed = (path: string) => {
    setViewedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
        // Auto-collapse when marking as viewed
        setExpandedFiles((prevExpanded) => {
          const nextExpanded = new Set(prevExpanded);
          nextExpanded.delete(path);
          return nextExpanded;
        });
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

  const navigateToFile = (path: string) => {
    setSelectedFile(path);
    setExpandedFiles((prev) => new Set(prev).add(path));
    if (isMobile) {
      closeSidebar(); // Close drawer on file selection
    }
    if (viewMode === 'all') {
      const element = document.getElementById(`file-${path.replace(/\//g, "-")}`);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // In single file mode, reset scroll to top
      scrollContainerRef.current?.scrollTo({ top: 0 });
    }
  };

  const navigateToPrevFile = () => {
    if (!selectedFile) return;
    const currentIndex = files.findIndex((f) => f.newPath === selectedFile);
    const prevFile = files[currentIndex - 1];
    if (currentIndex > 0 && prevFile) {
      navigateToFile(prevFile.newPath);
    }
  };

  const navigateToNextFile = () => {
    if (!selectedFile) return;
    const currentIndex = files.findIndex((f) => f.newPath === selectedFile);
    const nextFile = files[currentIndex + 1];
    if (currentIndex < files.length - 1 && nextFile) {
      navigateToFile(nextFile.newPath);
    }
  };

  const handleNoFeedback = async () => {
    try {
      const res = await fetch("/api/send-to-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "No feedback" }),
      });
      if (res.ok) {
        setNoFeedbackSent(true);
      }
    } catch (err) {
      console.error("Failed to send to Claude:", err);
    }
  };

  // Keyboard navigation for single-file mode
  useEffect(() => {
    if (viewMode !== 'single') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        navigateToPrevFile();
      } else if (e.key === 'ArrowRight') {
        navigateToNextFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, selectedFile, files]);

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

      // Calculate offset between new and old line numbers
      // For "before": offset at hunk start
      // For "after": offset at hunk end (accounts for additions/deletions within the hunk)
      const offset = direction === "before"
        ? hunk.newStart - hunk.oldStart
        : (hunk.newStart + hunk.newCount) - (hunk.oldStart + hunk.oldCount);

      const newLines: DiffLine[] = data.lines.map((line: { lineNum: number; content: string }) => ({
        type: "context" as const,
        content: line.content,
        oldLineNum: line.lineNum - offset,
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
    <div
      className={`diff-viewer ${crossingBreakpoint ? 'crossing-breakpoint' : ''}`}
      style={{ '--sidebar-width': `${sidebarCollapsed ? 0 : sidebarWidth}px` } as React.CSSProperties}
    >
      {isMobile && !sidebarCollapsed && (
        <div className="drawer-backdrop" onClick={closeSidebar} />
      )}
      <div
        ref={sidebarRef}
        className={`diff-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile-drawer' : ''}`}
        style={!isMobile && !sidebarCollapsed ? { width: sidebarWidth, minWidth: sidebarWidth } : undefined}
      >
        <FileTree
          files={files}
          selectedFile={selectedFile}
          onSelectFile={navigateToFile}
          viewedFiles={viewedFiles}
          totalAdditions={totalAdditions}
          totalDeletions={totalDeletions}
          commentCounts={commentState.fileCommentCounts}
        />
        {!isMobile && !sidebarCollapsed && (
          <div className="sidebar-resize-handle" onMouseDown={handleResizeMouseDown} />
        )}
      </div>
      <div className="diff-main" ref={scrollContainerRef}>
        <div
          ref={headerRef}
          className="diff-header"
          style={!isMobile ? { left: sidebarCollapsed ? 0 : sidebarWidth } : undefined}
        >
          <div className="diff-header-row">
            <h1>Voom</h1>
            {diffData?.directory && (
              <span className="directory-badge">{diffData.directory}</span>
            )}
            <button
              className="theme-toggle-btn"
              onClick={cycleTheme}
              title={`Theme: ${theme}`}
            >
              {resolvedTheme === "light" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "auto" && <span className="theme-auto-indicator" />}
            </button>
          </div>
          <div className="diff-header-row">
            <button
              className="sidebar-toggle-btn"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {sidebarCollapsed ? <Menu size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <div className="view-mode-toggle">
              <button
                className={`mode-btn ${viewMode === 'all' ? 'mode-btn-active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                <span className="mode-btn-full">All Files</span>
                <span className="mode-btn-compact">All</span>
              </button>
              <button
                className={`mode-btn ${viewMode === 'single' ? 'mode-btn-active' : ''}`}
                onClick={() => setViewMode('single')}
              >
                <span className="mode-btn-full">Single File</span>
                <span className="mode-btn-compact">Single</span>
              </button>
            </div>
            <div className="viewed-progress">
              <progress
                className="viewed-progress-bar"
                value={viewedFiles.size}
                max={files.length}
              />
              <span className="viewed-progress-text">
                {viewedFiles.size} / {files.length} viewed
              </span>
            </div>
            {claudeCodeMode && (
              <button
                className="no-feedback-btn"
                onClick={handleNoFeedback}
                disabled={!isConnected}
                title={!isConnected ? "Cannot send feedback while disconnected" : undefined}
              >
                No Feedback
              </button>
            )}
            <button
              className="prompt-btn"
              onClick={() => setShowPromptModal(true)}
              disabled={commentState.comments.size === 0}
            >
              Prompt
              {commentState.comments.size > 0 && (
                <span className="comment-badge">{commentState.comments.size}</span>
              )}
            </button>
          </div>
        </div>
        <div className={`diff-files ${viewMode === 'single' ? 'diff-files-single' : ''}`}>
          {viewMode === 'all' ? (
            files.map((file) => (
              <div
                key={file.newPath}
                id={`file-${file.newPath.replace(/\//g, "-")}`}
                data-file-path={file.newPath}
              >
                <DiffFile
                  file={file}
                  isExpanded={expandedFiles.has(file.newPath)}
                  isViewed={viewedFiles.has(file.newPath)}
                  onToggle={() => toggleFile(file.newPath)}
                  onToggleViewed={() => toggleViewed(file.newPath)}
                  hunkExpansions={hunkExpansions}
                  onExpandContext={expandHunkContext}
                  commentState={commentState}
                />
              </div>
            ))
          ) : (
            (() => {
              const file = files.find((f) => f.newPath === selectedFile);
              return file ? (
                <div
                  key={file.newPath}
                  id={`file-${file.newPath.replace(/\//g, "-")}`}
                  data-file-path={file.newPath}
                >
                  <DiffFile
                    file={file}
                    isExpanded={true}
                    isViewed={viewedFiles.has(file.newPath)}
                    onToggle={() => toggleFile(file.newPath)}
                    onToggleViewed={() => toggleViewed(file.newPath)}
                    hunkExpansions={hunkExpansions}
                    onExpandContext={expandHunkContext}
                    commentState={commentState}
                  />
                </div>
              ) : null;
            })()
          )}
        </div>
        {viewMode === 'single' && (
          <div
            ref={navRef}
            className="single-file-nav"
            style={!isMobile ? { transform: `translateX(calc(-50% + ${sidebarCollapsed ? 0 : sidebarWidth / 2}px))` } : undefined}
          >
            <button
              className="nav-btn"
              onClick={navigateToPrevFile}
              disabled={!selectedFile || files.findIndex((f) => f.newPath === selectedFile) === 0}
            >
              ← Prev
            </button>
            <span className="nav-position">
              {selectedFile ? files.findIndex((f) => f.newPath === selectedFile) + 1 : 0} of {files.length}
            </span>
            <button
              className="nav-btn"
              onClick={navigateToNextFile}
              disabled={!selectedFile || files.findIndex((f) => f.newPath === selectedFile) === files.length - 1}
            >
              Next →
            </button>
          </div>
        )}
        {claudeCodeMode && !isConnected && (
          <div
            className="connection-indicator"
            style={!isMobile ? { transform: `translateX(calc(-50% + ${sidebarCollapsed ? 0 : sidebarWidth / 2}px))` } : undefined}
          >
            {connectionStatus === "hash-mismatch" ? "Diff changed" : "Disconnected"}
          </div>
        )}
      </div>
      {showPromptModal && (
        <PromptModal
          prompt={generatePrompt({ comments: commentState.comments, files, hunkExpansions })}
          onClose={() => setShowPromptModal(false)}
          claudeCodeMode={claudeCodeMode}
          isConnected={isConnected}
        />
      )}
      {noFeedbackSent && (
        <div className="prompt-modal-backdrop">
          <div className="prompt-modal prompt-modal-sent">
            <div className="sent-message">
              <svg width="48" height="48" viewBox="0 0 16 16" fill="#2da44e">
                <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z" />
              </svg>
              <h2>No feedback sent to Claude Code</h2>
              <p>You can close this tab now.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
