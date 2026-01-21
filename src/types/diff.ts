export interface DiffResponse {
  diff: string;
  directory: string;
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

export interface DiffLine {
  type: "context" | "addition" | "deletion" | "hunk-header";
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
  segments?: TextSegment[];
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface FileDiff {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}
