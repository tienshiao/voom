import type { LineComment, FileDiff, HunkExpansionState, DiffLine } from "../types/diff";

interface GeneratePromptParams {
  comments: Map<string, LineComment>;
  files: FileDiff[];
  hunkExpansions: Map<string, HunkExpansionState>;
}

function getLineContent(
  filePath: string,
  lineNumber: number,
  lineType: string,
  files: FileDiff[],
  hunkExpansions: Map<string, HunkExpansionState>
): string | null {
  const file = files.find((f) => f.newPath === filePath || f.oldPath === filePath);
  if (!file) return null;

  // Search through hunks
  for (let hunkIndex = 0; hunkIndex < file.hunks.length; hunkIndex++) {
    const hunk = file.hunks[hunkIndex];
    const expansionKey = `${filePath}:${hunkIndex}`;
    const expansion = hunkExpansions.get(expansionKey);

    // Check expanded before lines
    if (expansion?.beforeLines) {
      for (const line of expansion.beforeLines) {
        if (matchesLine(line, lineNumber, lineType)) {
          return line.content;
        }
      }
    }

    // Check hunk lines
    for (const line of hunk.lines) {
      if (matchesLine(line, lineNumber, lineType)) {
        return line.content;
      }
    }

    // Check expanded after lines
    if (expansion?.afterLines) {
      for (const line of expansion.afterLines) {
        if (matchesLine(line, lineNumber, lineType)) {
          return line.content;
        }
      }
    }
  }

  return null;
}

function matchesLine(line: DiffLine, lineNumber: number, lineType: string): boolean {
  if (line.type !== lineType) return false;

  if (lineType === "deletion") {
    return line.oldLineNum === lineNumber;
  } else {
    return line.newLineNum === lineNumber;
  }
}

function getFileExtension(filePath: string): string {
  const parts = filePath.split(".");
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return "";
}

export function generatePrompt({ comments, files, hunkExpansions }: GeneratePromptParams): string {
  if (comments.size === 0) {
    return "No comments to include in the prompt.";
  }

  // Group comments by file
  const commentsByFile = new Map<string, LineComment[]>();
  for (const comment of comments.values()) {
    const existing = commentsByFile.get(comment.filePath) || [];
    existing.push(comment);
    commentsByFile.set(comment.filePath, existing);
  }

  // Sort files alphabetically
  const sortedFiles = Array.from(commentsByFile.keys()).sort();

  const lines: string[] = [
    "# Code Review Feedback",
    "",
    "Please address the following code review comments:",
    "",
  ];

  for (const filePath of sortedFiles) {
    const fileComments = commentsByFile.get(filePath)!;
    // Sort comments by line number
    fileComments.sort((a, b) => a.lineNumber - b.lineNumber);

    lines.push(`## File: ${filePath}`);
    lines.push("");

    for (const comment of fileComments) {
      const lineTypeLabel =
        comment.lineType === "addition"
          ? "addition"
          : comment.lineType === "deletion"
            ? "deletion"
            : "context";

      lines.push(`### Line ${comment.lineNumber} (${lineTypeLabel})`);

      const lineContent = getLineContent(
        comment.filePath,
        comment.lineNumber,
        comment.lineType,
        files,
        hunkExpansions
      );

      if (lineContent) {
        const ext = getFileExtension(filePath);
        lines.push("```" + ext);
        lines.push(lineContent);
        lines.push("```");
      }

      lines.push(`**Comment:** ${comment.content}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
