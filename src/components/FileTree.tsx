import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, X } from "lucide-react";
import type { FileDiff } from "../types/diff";
import { FileIcon } from "./FileIcon";
import "./FileTree.css";

interface FileTreeProps {
  files: FileDiff[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  viewedFiles?: Set<string>;
  totalAdditions: number;
  totalDeletions: number;
}

export function FileTree({ files, selectedFile, onSelectFile, viewedFiles, totalAdditions, totalDeletions }: FileTreeProps) {
  const [filter, setFilter] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);

  const filteredFiles = filter
    ? files.filter((file) =>
        file.newPath.toLowerCase().includes(filter.toLowerCase())
      )
    : files;

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

  const getAllDirectoryPaths = (node: Record<string, any>, path: string = ""): string[] => {
    const paths: string[] = [];
    Object.entries(node).forEach(([key, value]) => {
      if (key === "__file") return;
      const fullPath = path ? `${path}/${key}` : key;
      const isFile = value.__file;
      if (!isFile) {
        paths.push(fullPath);
        paths.push(...getAllDirectoryPaths(value, fullPath));
      }
    });
    return paths;
  };

  const tree = buildTree(filteredFiles);

  // Expand all directories on initial load
  useEffect(() => {
    if (!hasInitialized && files.length > 0) {
      const allPaths = getAllDirectoryPaths(buildTree(files));
      setExpandedPaths(new Set(allPaths));
      setHasInitialized(true);
    }
  }, [files, hasInitialized]);

  // Auto-expand parent directories when a file is selected
  useEffect(() => {
    if (selectedFile) {
      const parts = selectedFile.split("/");
      const parentPaths: string[] = [];
      for (let i = 1; i < parts.length; i++) {
        parentPaths.push(parts.slice(0, i).join("/"));
      }
      if (parentPaths.length > 0) {
        setExpandedPaths(prev => {
          const next = new Set(prev);
          parentPaths.forEach(p => next.add(p));
          return next;
        });
      }
    }
  }, [selectedFile]);

  const toggleDirectory = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
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
      const isExpanded = expandedPaths.has(fullPath);
      const isViewed = isFile && file && viewedFiles?.has(file.newPath);

      return (
        <div key={fullPath}>
          <div
            className={`tree-item ${isFile ? "tree-file" : "tree-folder"} ${
              selectedFile === file?.newPath ? "selected" : ""
            } ${isViewed ? "tree-item-viewed" : ""}`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => isFile ? onSelectFile(file!.newPath) : toggleDirectory(fullPath)}
          >
            {!isFile && (
              <span className="tree-chevron">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
            <span className="tree-icon">
              <FileIcon filename={key} isFolder={!isFile} />
            </span>
            <span className="tree-name">{key}</span>
            {isFile && file && (
              <span className="tree-stats">
                <span className="stat-add">+{file.additions}</span>
                <span className="stat-del">-{file.deletions}</span>
              </span>
            )}
            {isFile && (
              <span
                className={`status-dot ${file?.status && file.status !== "modified" ? `status-${file.status}` : ""}`}
                title={file?.status === "added" ? "Added" : file?.status === "deleted" ? "Deleted" : undefined}
              />
            )}
          </div>
          {!isFile && isExpanded && renderTree(value, fullPath, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="file-tree">
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <span className="files-count">
            {files.length} file{files.length !== 1 ? "s" : ""} changed
          </span>
          <span className="total-stats">
            <span className="stat-add">+{totalAdditions}</span>
            <span className="stat-del">-{totalDeletions}</span>
          </span>
        </div>
        <div className="sidebar-header-row file-filter">
          <svg className="filter-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
          </svg>
          <input
            type="text"
            placeholder="Filter files"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-input"
          />
          {filter && (
            <button
              className="filter-clear"
              onClick={() => setFilter("")}
              aria-label="Clear filter"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="file-tree-list">{renderTree(tree)}</div>
    </div>
  );
}
