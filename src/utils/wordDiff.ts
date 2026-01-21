import type { TextSegment, FileDiff } from "../types/diff";

// Tokenize a string into words and whitespace
function tokenize(str: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inWord = false;

  for (const char of str) {
    const isWordChar = /\S/.test(char);
    if (isWordChar !== inWord) {
      if (current) tokens.push(current);
      current = char;
      inWord = isWordChar;
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

// Compute Longest Common Subsequence of two token arrays
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array<number>(n + 1).fill(0);
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const aToken = a[i - 1];
      const bToken = b[j - 1];
      if (aToken === bToken) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    const aToken = a[i - 1];
    const bToken = b[j - 1];
    if (aToken === bToken && aToken !== undefined) {
      lcs.unshift(aToken);
      i--;
      j--;
    } else if (dp[i - 1]![j]! > dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

// Compute word-level diff between deletion and addition lines
export function computeWordDiff(
  deletion: string,
  addition: string
): { deletionSegments: TextSegment[]; additionSegments: TextSegment[] } {
  const delTokens = tokenize(deletion);
  const addTokens = tokenize(addition);
  const lcs = computeLCS(delTokens, addTokens);

  const deletionSegments: TextSegment[] = [];
  const additionSegments: TextSegment[] = [];

  let lcsIdx = 0;

  // Process deletion tokens
  for (const token of delTokens) {
    if (lcsIdx < lcs.length && token === lcs[lcsIdx]) {
      deletionSegments.push({ text: token, highlighted: false });
      lcsIdx++;
    } else {
      deletionSegments.push({ text: token, highlighted: true });
    }
  }

  // Reset LCS index for addition tokens
  lcsIdx = 0;

  // Process addition tokens
  for (const token of addTokens) {
    if (lcsIdx < lcs.length && token === lcs[lcsIdx]) {
      additionSegments.push({ text: token, highlighted: false });
      lcsIdx++;
    } else {
      additionSegments.push({ text: token, highlighted: true });
    }
  }

  // Merge adjacent segments with same highlighting
  const mergeSegments = (segments: TextSegment[]): TextSegment[] => {
    const merged: TextSegment[] = [];
    for (const seg of segments) {
      const last = merged[merged.length - 1];
      if (last && last.highlighted === seg.highlighted) {
        last.text += seg.text;
      } else {
        merged.push({ ...seg });
      }
    }
    return merged;
  };

  return {
    deletionSegments: mergeSegments(deletionSegments),
    additionSegments: mergeSegments(additionSegments),
  };
}

// Enhance parsed diff files with word-level highlighting
export function enhanceWithWordDiff(files: FileDiff[]): FileDiff[] {
  for (const file of files) {
    for (const hunk of file.hunks) {
      const lines = hunk.lines;
      let i = 0;

      while (i < lines.length) {
        const currentLine = lines[i];
        // Look for consecutive deletion+addition pairs
        if (currentLine && currentLine.type === "deletion") {
          // Collect consecutive deletions
          const deletions: number[] = [];
          while (i < lines.length) {
            const line = lines[i];
            if (line && line.type === "deletion") {
              deletions.push(i);
              i++;
            } else {
              break;
            }
          }

          // Collect consecutive additions
          const additions: number[] = [];
          while (i < lines.length) {
            const line = lines[i];
            if (line && line.type === "addition") {
              additions.push(i);
              i++;
            } else {
              break;
            }
          }

          // Pair deletions and additions 1:1
          const pairCount = Math.min(deletions.length, additions.length);
          for (let p = 0; p < pairCount; p++) {
            const delIdx = deletions[p];
            const addIdx = additions[p];
            if (delIdx === undefined || addIdx === undefined) continue;

            const delLine = lines[delIdx];
            const addLine = lines[addIdx];
            if (!delLine || !addLine) continue;

            const { deletionSegments, additionSegments } = computeWordDiff(
              delLine.content,
              addLine.content
            );

            delLine.segments = deletionSegments;
            addLine.segments = additionSegments;
          }
        } else {
          i++;
        }
      }
    }
  }

  return files;
}
