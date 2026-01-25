import { test, expect, describe } from "bun:test";
import { parseDiff } from "./parseDiff";
import { computeWordDiff, enhanceWithWordDiff } from "./wordDiff";

describe("parseDiff", () => {
  describe("modified files", () => {
    test("parses a simple modified file", () => {
      const diff = `diff --git a/src/index.ts b/src/index.ts
index abc1234..def5678 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
 const x = 1;
-const y = 2;
+const y = 3;
 const z = 3;`;

      const files = parseDiff(diff);
      expect(files.length).toBe(1);
      expect(files[0]!.oldPath).toBe("src/index.ts");
      expect(files[0]!.newPath).toBe("src/index.ts");
      expect(files[0]!.status).toBe("modified");
      expect(files[0]!.additions).toBe(1);
      expect(files[0]!.deletions).toBe(1);
    });

    test("parses multiple hunks in a file", () => {
      const diff = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
 const x = 1;
-const y = 2;
+const y = 3;
 const z = 3;
@@ -10,3 +10,4 @@
 function foo() {
   return 42;
 }
+export default foo;`;

      const files = parseDiff(diff);
      expect(files.length).toBe(1);
      expect(files[0]!.hunks.length).toBe(2);
      expect(files[0]!.additions).toBe(2);
      expect(files[0]!.deletions).toBe(1);
    });
  });

  describe("added files", () => {
    test("parses a new file with content", () => {
      const diff = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+const x = 1;
+const y = 2;
+const z = 3;`;

      const files = parseDiff(diff);
      expect(files.length).toBe(1);
      expect(files[0]!.oldPath).toBe("/dev/null");
      expect(files[0]!.newPath).toBe("src/new.ts");
      expect(files[0]!.status).toBe("added");
      expect(files[0]!.additions).toBe(3);
      expect(files[0]!.deletions).toBe(0);
    });

    test("parses an empty new file (no ---/+++ lines)", () => {
      // After path normalization, git diff for empty new files looks like this
      const diff = `diff --git a/src/empty.txt b/src/empty.txt
new file mode 100644
index 0000000..e69de29`;

      const files = parseDiff(diff);
      expect(files.length).toBe(1);
      expect(files[0]!.oldPath).toBe("src/empty.txt");
      expect(files[0]!.newPath).toBe("src/empty.txt");
      expect(files[0]!.status).toBe("added");
      expect(files[0]!.hunks.length).toBe(0);
      expect(files[0]!.additions).toBe(0);
      expect(files[0]!.deletions).toBe(0);
    });

    test("parses empty new file followed by regular file", () => {
      const diff = `diff --git a/empty.txt b/empty.txt
new file mode 100644
index 0000000..e69de29
diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
 const x = 1;
-const y = 2;
+const y = 3;
 const z = 3;`;

      const files = parseDiff(diff);
      expect(files.length).toBe(2);

      // First file: empty new file
      expect(files[0]!.newPath).toBe("empty.txt");
      expect(files[0]!.status).toBe("added");
      expect(files[0]!.hunks.length).toBe(0);

      // Second file: modified file
      expect(files[1]!.newPath).toBe("src/index.ts");
      expect(files[1]!.status).toBe("modified");
      expect(files[1]!.hunks.length).toBe(1);
    });

    test("parses empty new file with dev/null in header (alternative format)", () => {
      // Some git configurations may produce this format
      const diff = `diff --git a/dev/null b/src/empty.txt
new file mode 100644
index 0000000..e69de29`;

      const files = parseDiff(diff);
      expect(files.length).toBe(1);
      expect(files[0]!.newPath).toBe("src/empty.txt");
      expect(files[0]!.status).toBe("added");
    });
  });

  describe("deleted files", () => {
    test("parses a deleted file", () => {
      const diff = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
index abc1234..0000000
--- a/src/old.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-const x = 1;
-const y = 2;
-const z = 3;`;

      const files = parseDiff(diff);
      expect(files.length).toBe(1);
      expect(files[0]!.oldPath).toBe("src/old.ts");
      expect(files[0]!.newPath).toBe("src/old.ts"); // newPath is set to oldPath for deleted files
      expect(files[0]!.status).toBe("deleted");
      expect(files[0]!.additions).toBe(0);
      expect(files[0]!.deletions).toBe(3);
    });

    test("parses an empty deleted file (no ---/+++ lines)", () => {
      const diff = `diff --git a/empty.txt b/empty.txt
deleted file mode 100644
index e69de29..0000000`;

      const files = parseDiff(diff);
      expect(files.length).toBe(1);
      expect(files[0]!.newPath).toBe("empty.txt");
      expect(files[0]!.status).toBe("deleted");
      expect(files[0]!.hunks.length).toBe(0);
    });
  });

  describe("multiple files", () => {
    test("parses multiple files in one diff", () => {
      const diff = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1 +1 @@
-const a = 1;
+const a = 2;
diff --git a/src/b.ts b/src/b.ts
--- a/src/b.ts
+++ b/src/b.ts
@@ -1 +1 @@
-const b = 1;
+const b = 2;
diff --git a/src/c.ts b/src/c.ts
--- a/src/c.ts
+++ b/src/c.ts
@@ -1 +1 @@
-const c = 1;
+const c = 2;`;

      const files = parseDiff(diff);
      expect(files.length).toBe(3);
      expect(files[0]!.newPath).toBe("src/a.ts");
      expect(files[1]!.newPath).toBe("src/b.ts");
      expect(files[2]!.newPath).toBe("src/c.ts");
    });
  });

  describe("hunk parsing", () => {
    test("parses hunk header with context", () => {
      const diff = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,7 +10,7 @@ function example() {
 context line
-deleted line
+added line
 context line`;

      const files = parseDiff(diff);
      const hunk = files[0]!.hunks[0]!;
      expect(hunk.oldStart).toBe(10);
      expect(hunk.oldCount).toBe(7);
      expect(hunk.newStart).toBe(10);
      expect(hunk.newCount).toBe(7);
      // First line is hunk-header with function context
      expect(hunk.lines[0]!.type).toBe("hunk-header");
      expect(hunk.lines[0]!.content).toBe(" function example() {");
    });

    test("parses line numbers correctly", () => {
      const diff = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -5,4 +5,4 @@
 line 5
-line 6
+new line 6
 line 7`;

      const files = parseDiff(diff);
      const lines = files[0]!.hunks[0]!.lines;

      // Skip hunk-header
      expect(lines[1]!.type).toBe("context");
      expect(lines[1]!.oldLineNum).toBe(5);
      expect(lines[1]!.newLineNum).toBe(5);

      expect(lines[2]!.type).toBe("deletion");
      expect(lines[2]!.oldLineNum).toBe(6);

      expect(lines[3]!.type).toBe("addition");
      expect(lines[3]!.newLineNum).toBe(6);

      expect(lines[4]!.type).toBe("context");
      expect(lines[4]!.oldLineNum).toBe(7);
      expect(lines[4]!.newLineNum).toBe(7);
    });
  });

  describe("edge cases", () => {
    test("handles empty diff", () => {
      const files = parseDiff("");
      expect(files.length).toBe(0);
    });

    test("handles diff with only header (no hunks)", () => {
      const diff = `diff --git a/src/index.ts b/src/index.ts
index abc1234..def5678 100644`;

      const files = parseDiff(diff);
      expect(files.length).toBe(1);
      expect(files[0]!.newPath).toBe("src/index.ts");
      expect(files[0]!.hunks.length).toBe(0);
    });

    test("handles file paths with spaces", () => {
      const diff = `diff --git a/src/my file.ts b/src/my file.ts
--- a/src/my file.ts
+++ b/src/my file.ts
@@ -1 +1 @@
-old
+new`;

      const files = parseDiff(diff);
      expect(files[0]!.newPath).toBe("src/my file.ts");
    });

    test("handles binary files with spaces in name (screenshots)", () => {
      // Binary files don't have --- and +++ lines, only diff --git header
      const diff = `diff --git a/Screenshot 2026-01-21 at 3.04.40 PM.png b/Screenshot 2026-01-21 at 3.04.40 PM.png
new file mode 100644
index 0000000..abc1234
Binary files /dev/null and b/Screenshot 2026-01-21 at 3.04.40 PM.png differ`;

      const files = parseDiff(diff);
      expect(files.length).toBe(1);
      expect(files[0]!.newPath).toBe("Screenshot 2026-01-21 at 3.04.40 PM.png");
      expect(files[0]!.status).toBe("added");
    });

    test("handles quoted paths with special characters", () => {
      const diff = `diff --git "a/path with spaces.txt" "b/path with spaces.txt"
--- "a/path with spaces.txt"
+++ "b/path with spaces.txt"
@@ -1 +1 @@
-old
+new`;

      const files = parseDiff(diff);
      expect(files[0]!.newPath).toBe("path with spaces.txt");
    });

    test("handles quoted paths with octal-escaped UTF-8 bytes (narrow no-break space)", () => {
      // Git escapes non-ASCII characters as octal bytes
      // \342\200\257 = UTF-8 encoding of U+202F (narrow no-break space)
      const diff = `diff --git "a/Screenshot 2026-01-21 at 3.04.40\\342\\200\\257PM.png" "b/Screenshot 2026-01-21 at 3.04.40\\342\\200\\257PM.png"
new file mode 100644
index 0000000..abc1234
Binary files /dev/null and "b/Screenshot 2026-01-21 at 3.04.40\\342\\200\\257PM.png" differ`;

      const files = parseDiff(diff);
      expect(files.length).toBe(1);
      // The narrow no-break space (U+202F) should be decoded
      expect(files[0]!.newPath).toBe("Screenshot 2026-01-21 at 3.04.40\u202FPM.png");
      expect(files[0]!.status).toBe("added");
    });
  });
});

describe("computeWordDiff", () => {
  test("identifies changed words", () => {
    const result = computeWordDiff("const x = 1;", "const x = 2;");

    // Check deletion segments - tokenizer groups non-whitespace together (e.g., "1;")
    expect(result.deletionSegments.some(s => s.text.includes("1") && s.highlighted)).toBe(true);
    expect(result.deletionSegments.some(s => s.text.includes("const") && !s.highlighted)).toBe(true);

    // Check addition segments
    expect(result.additionSegments.some(s => s.text.includes("2") && s.highlighted)).toBe(true);
    expect(result.additionSegments.some(s => s.text.includes("const") && !s.highlighted)).toBe(true);
  });

  test("handles completely different lines", () => {
    const result = computeWordDiff("hello world", "foo bar");

    // All deletion tokens should be highlighted
    const allDelHighlighted = result.deletionSegments.every(s =>
      s.text.trim() === "" || s.highlighted
    );
    expect(allDelHighlighted).toBe(true);

    // All addition tokens should be highlighted
    const allAddHighlighted = result.additionSegments.every(s =>
      s.text.trim() === "" || s.highlighted
    );
    expect(allAddHighlighted).toBe(true);
  });

  test("handles identical lines", () => {
    const result = computeWordDiff("const x = 1;", "const x = 1;");

    // No segments should be highlighted
    const noDelHighlighted = result.deletionSegments.every(s => !s.highlighted);
    const noAddHighlighted = result.additionSegments.every(s => !s.highlighted);

    expect(noDelHighlighted).toBe(true);
    expect(noAddHighlighted).toBe(true);
  });

  test("handles empty strings", () => {
    const result = computeWordDiff("", "new content");
    expect(result.deletionSegments.length).toBe(0);
    expect(result.additionSegments.length).toBeGreaterThan(0);
  });

  test("preserves whitespace", () => {
    const result = computeWordDiff("a  b", "a   b");

    // Should have segments for both versions
    expect(result.deletionSegments.length).toBeGreaterThan(0);
    expect(result.additionSegments.length).toBeGreaterThan(0);
  });

  test("merges adjacent segments with same highlighting", () => {
    const result = computeWordDiff("aaa bbb", "ccc ddd");

    // All words changed, so they should be merged into fewer segments
    // (highlighted words separated by unhighlighted whitespace)
    expect(result.deletionSegments.length).toBeLessThanOrEqual(4);
    expect(result.additionSegments.length).toBeLessThanOrEqual(4);
  });
});

describe("enhanceWithWordDiff", () => {
  test("adds segments to paired deletion/addition lines", () => {
    const diff = `diff --git a/test.ts b/test.ts
--- a/test.ts
+++ b/test.ts
@@ -1 +1 @@
-const x = 1;
+const x = 2;`;

    const files = parseDiff(diff);
    const enhanced = enhanceWithWordDiff(files);

    const hunk = enhanced[0]!.hunks[0]!;
    const deletionLine = hunk.lines.find(l => l.type === "deletion");
    const additionLine = hunk.lines.find(l => l.type === "addition");

    expect(deletionLine!.segments).toBeDefined();
    expect(additionLine!.segments).toBeDefined();
  });

  test("unpaired lines get syntax highlighting but no word-diff highlighting", () => {
    const diff = `diff --git a/test.ts b/test.ts
--- a/test.ts
+++ b/test.ts
@@ -1,2 +1,3 @@
 context
-deleted only
+added 1
+added 2`;

    const files = parseDiff(diff);
    const enhanced = enhanceWithWordDiff(files);

    const hunk = enhanced[0]!.hunks[0]!;
    const deletionLine = hunk.lines.find(l => l.type === "deletion");
    const additionLines = hunk.lines.filter(l => l.type === "addition");

    // First deletion/addition pair should have segments with word-diff
    expect(deletionLine!.segments).toBeDefined();
    expect(additionLines[0]!.segments).toBeDefined();

    // Second addition (unpaired) gets syntax highlighting segments but no word-diff highlights
    expect(additionLines[1]!.segments).toBeDefined();
    // All segments should have highlighted: false (no word-diff highlighting)
    expect(additionLines[1]!.segments!.every(s => s.highlighted === false)).toBe(true);
  });

  test("handles multiple deletion/addition pairs", () => {
    const diff = `diff --git a/test.ts b/test.ts
--- a/test.ts
+++ b/test.ts
@@ -1,2 +1,2 @@
-line one
-line two
+LINE ONE
+LINE TWO`;

    const files = parseDiff(diff);
    const enhanced = enhanceWithWordDiff(files);

    const hunk = enhanced[0]!.hunks[0]!;
    const deletions = hunk.lines.filter(l => l.type === "deletion");
    const additions = hunk.lines.filter(l => l.type === "addition");

    // Both pairs should have segments
    expect(deletions[0]!.segments).toBeDefined();
    expect(deletions[1]!.segments).toBeDefined();
    expect(additions[0]!.segments).toBeDefined();
    expect(additions[1]!.segments).toBeDefined();
  });
});
