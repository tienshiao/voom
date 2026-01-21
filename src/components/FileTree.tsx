import type { FileDiff } from "../types/diff";

interface FileTreeProps {
  files: FileDiff[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

export function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
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
