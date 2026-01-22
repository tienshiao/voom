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
  status?: "added" | "deleted" | "modified";
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export interface ContextRequest {
  filePath: string;
  startLine: number;
  endLine: number;
}

export interface ContextResponse {
  lines: { lineNum: number; content: string }[];
  hasMore: boolean;
}

export interface HunkExpansionState {
  beforeLines: DiffLine[];
  afterLines: DiffLine[];
  canExpandBefore: boolean;
  canExpandAfter: boolean;
}
