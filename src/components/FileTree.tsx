import { useState } from "react";
import type { FileDiff } from "../types/diff";
import { FileIcon } from "./FileIcon";

interface FileTreeProps {
  files: FileDiff[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

export function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
  const [filter, setFilter] = useState("");

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
          {!isFile && renderTree(value, fullPath, depth + 1)}
        </div>
      );
    });
  };

  const tree = buildTree(filteredFiles);

  return (
    <div className="file-tree">
      <div className="file-filter">
        <svg className="filter-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
        </svg>
        <input
          type="text"
          placeholder="Filter changed files"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
        />
      </div>
      <div className="file-tree-list">{renderTree(tree)}</div>
    </div>
  );
}
