// Custom error for non-git directories
export class NotAGitRepoError extends Error {
  constructor(dir: string) {
    super(`Not a git repository: ${dir}\n\nVoom requires a git repository to display diffs.\nPlease run voom from within a git repository or provide a path to one.`);
    this.name = 'NotAGitRepoError';
  }
}

// Resolve a directory to its git repository root
export async function resolveGitRoot(targetDir: string): Promise<string> {
  const result = await Bun.$`git -C ${targetDir} rev-parse --show-toplevel`
    .quiet()
    .nothrow();

  if (result.exitCode !== 0) {
    throw new NotAGitRepoError(targetDir);
  }

  return result.text().trim();
}

// Unescape git's quoted path format (handles octal-escaped UTF-8 bytes)
export function unescapeGitPath(path: string): string {
  let result = path;
  if (result.startsWith('"') && result.endsWith('"')) {
    result = result.slice(1, -1);
  }

  // Decode octal escape sequences as UTF-8 bytes
  result = result.replace(/((?:\\[0-7]{3})+)/g, (match) => {
    const bytes: number[] = [];
    const octalPattern = /\\([0-7]{3})/g;
    let octalMatch;
    while ((octalMatch = octalPattern.exec(match)) !== null) {
      bytes.push(parseInt(octalMatch[1]!, 8));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  });

  return result
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

// MIME types for images
const IMAGE_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  ico: "image/x-icon",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
};

export function getImageMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return IMAGE_MIME_TYPES[ext] || "application/octet-stream";
}
