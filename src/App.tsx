import { useState, useEffect, useRef } from "react";
import { FileTree } from "./components/FileTree";
import { DiffFile } from "./components/DiffFile";
import { parseDiff } from "./utils/parseDiff";
import type { DiffResponse, FileDiff } from "./types/diff";
import "./index.css";

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
