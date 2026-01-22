import {
  File,
  FileCode,
  FileCode2,
  FileJson,
  FileText,
  FileType,
  Folder,
  Image,
  Settings,
} from "lucide-react";

interface FileIconProps {
  filename: string;
  isFolder: boolean;
}

const ICON_SIZE = 16;

export function FileIcon({ filename, isFolder }: FileIconProps) {
  if (isFolder) {
    return <Folder size={ICON_SIZE} className="folder-icon" />;
  }

  const ext = filename.split(".").pop()?.toLowerCase() || "";

  switch (ext) {
    case "ts":
    case "tsx":
      return <FileCode2 size={ICON_SIZE} className="file-icon-ts" />;

    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return <FileCode size={ICON_SIZE} className="file-icon-js" />;

    case "json":
      return <FileJson size={ICON_SIZE} className="file-icon-json" />;

    case "css":
    case "scss":
    case "sass":
    case "less":
      return <FileType size={ICON_SIZE} className="file-icon-css" />;

    case "md":
    case "mdx":
    case "txt":
      return <FileText size={ICON_SIZE} className="file-icon-md" />;

    case "html":
    case "htm":
      return <FileCode size={ICON_SIZE} className="file-icon-html" />;

    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
    case "ico":
      return <Image size={ICON_SIZE} className="file-icon-image" />;

    case "yaml":
    case "yml":
    case "toml":
    case "ini":
    case "env":
    case "gitignore":
    case "editorconfig":
      return <Settings size={ICON_SIZE} className="file-icon-config" />;

    default:
      return <File size={ICON_SIZE} className="file-icon" />;
  }
}
