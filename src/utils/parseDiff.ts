import type { FileDiff, DiffHunk } from "../types/diff";

export function parseDiff(diffText: string): FileDiff[] {
  const files: FileDiff[] = [];
  const lines = diffText.split("\n");
  let currentFile: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // New file diff header - extract paths from header as fallback
    if (line.startsWith("diff --git")) {
      if (currentFile) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }
        // Set status if not already set (for empty files without ---/+++ lines)
        if (!currentFile.status) {
          if (currentFile.oldPath === "dev/null" || currentFile.oldPath === "/dev/null") {
            currentFile.status = "added";
          } else if (currentFile.newPath === "dev/null" || currentFile.newPath === "/dev/null") {
            currentFile.status = "deleted";
            currentFile.newPath = currentFile.oldPath;
          } else {
            currentFile.status = "modified";
          }
        }
        files.push(currentFile);
      }

      // Extract paths from "diff --git a/oldPath b/newPath" as fallback
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = {
        oldPath: match ? match[1] : "",
        newPath: match ? match[2] : "",
        hunks: [],
        additions: 0,
        deletions: 0,
      };
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    // Detect new file mode (for empty new files without ---/+++ lines)
    if (line.startsWith("new file mode")) {
      currentFile.status = "added";
      continue;
    }

    // Detect deleted file mode (for empty deleted files without ---/+++ lines)
    if (line.startsWith("deleted file mode")) {
      currentFile.status = "deleted";
      continue;
    }

    // Old file path
    if (line.startsWith("--- ")) {
      currentFile.oldPath = line.slice(4).replace(/^a\//, "");
      continue;
    }

    // New file path
    if (line.startsWith("+++ ")) {
      currentFile.newPath = line.slice(4).replace(/^b\//, "");

      // Determine file status and handle special paths
      if (currentFile.newPath === "/dev/null") {
        // Deleted file: use oldPath as the display path
        currentFile.status = "deleted";
        currentFile.newPath = currentFile.oldPath;
      } else if (currentFile.oldPath === "/dev/null") {
        // Added file
        currentFile.status = "added";
      } else {
        // Modified file
        currentFile.status = "modified";
      }
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
    // Set status if not already set (for empty files without ---/+++ lines)
    if (!currentFile.status) {
      if (currentFile.oldPath === "dev/null" || currentFile.oldPath === "/dev/null") {
        currentFile.status = "added";
      } else if (currentFile.newPath === "dev/null" || currentFile.newPath === "/dev/null") {
        currentFile.status = "deleted";
        currentFile.newPath = currentFile.oldPath;
      } else {
        currentFile.status = "modified";
      }
    }
    files.push(currentFile);
  }

  return files;
}
