import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { serve, type Server } from "bun";

const testDir = import.meta.dir;
const projectRoot = testDir.replace(/\/src$/, "");

// Create a minimal test server with just the API routes
let server: Server;
const TEST_PORT = 3099;

async function getFullDiff(dir: string): Promise<string> {
  const trackedDiff = await Bun.$`git -C ${dir} diff`.quiet().text();
  const untrackedResult =
    await Bun.$`git -C ${dir} ls-files --others --exclude-standard`.quiet();
  const untrackedFiles = untrackedResult
    .text()
    .trim()
    .split("\n")
    .filter(Boolean);

  const untrackedDiffs: string[] = [];
  for (const file of untrackedFiles) {
    const filePath = `${dir}/${file}`;
    const result =
      await Bun.$`git diff --no-index /dev/null ${filePath}`.quiet().nothrow();
    if (result.stdout.length > 0) {
      let diff = result.text();
      diff = diff.replace(/a\/dev\/null/g, "a/" + file);
      diff = diff.replace(
        new RegExp(
          "b" + filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "g"
        ),
        "b/" + file
      );
      untrackedDiffs.push(diff);
    }
  }

  return trackedDiff + untrackedDiffs.join("");
}

beforeAll(() => {
  server = serve({
    port: TEST_PORT,
    routes: {
      "/api/diff": {
        async GET() {
          try {
            const diff = await getFullDiff(projectRoot);
            return Response.json({
              diff,
              directory: projectRoot,
            });
          } catch (error) {
            return Response.json(
              {
                error: "Failed to get git diff",
                message: error instanceof Error ? error.message : String(error),
                directory: projectRoot,
              },
              { status: 500 }
            );
          }
        },
      },
      "/api/context": {
        async GET(req: Request) {
          const url = new URL(req.url);
          const filePath = url.searchParams.get("file");
          const start = parseInt(url.searchParams.get("start") || "1", 10);
          const end = parseInt(url.searchParams.get("end") || "1", 10);

          if (!filePath) {
            return Response.json(
              { error: "Missing file parameter" },
              { status: 400 }
            );
          }

          const fullPath = `${testDir}/${filePath}`;
          const file = Bun.file(fullPath);

          if (!(await file.exists())) {
            return Response.json({ error: "File not found" }, { status: 404 });
          }

          const content = await file.text();
          const allLines = content.split("\n");
          const totalLines = allLines.length;

          const clampedStart = Math.max(1, Math.min(start, totalLines));
          const clampedEnd = Math.max(1, Math.min(end, totalLines));

          const lines: { lineNum: number; content: string }[] = [];
          for (let i = clampedStart; i <= clampedEnd; i++) {
            lines.push({
              lineNum: i,
              content: allLines[i - 1] ?? "",
            });
          }

          return Response.json({
            lines,
            hasMore: end < totalLines,
            totalLines,
          });
        },
      },
    },
  });
});

afterAll(() => {
  server.stop();
});

const baseUrl = `http://localhost:${TEST_PORT}`;

describe("/api/context", () => {
  test("returns lines for valid file and range", async () => {
    const res = await fetch(
      `${baseUrl}/api/context?file=index.ts&start=1&end=3`
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lines).toBeArray();
    expect(data.lines.length).toBe(3);
    expect(data.lines[0].lineNum).toBe(1);
    expect(data.lines[1].lineNum).toBe(2);
    expect(data.lines[2].lineNum).toBe(3);
    expect(data.totalLines).toBeGreaterThan(0);
  });

  test("returns hasMore=true when more lines exist", async () => {
    const res = await fetch(
      `${baseUrl}/api/context?file=index.ts&start=1&end=5`
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hasMore).toBe(true);
  });

  test("returns hasMore=false when at end of file", async () => {
    // First get total lines
    const initial = await fetch(
      `${baseUrl}/api/context?file=index.ts&start=1&end=1`
    );
    const initialData = await initial.json();
    const totalLines = initialData.totalLines;

    // Request lines up to and past the end
    const res = await fetch(
      `${baseUrl}/api/context?file=index.ts&start=${totalLines - 2}&end=${totalLines + 10}`
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hasMore).toBe(false);
  });

  test("returns 400 when file parameter is missing", async () => {
    const res = await fetch(`${baseUrl}/api/context?start=1&end=5`);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing file parameter");
  });

  test("returns 404 for non-existent file", async () => {
    const res = await fetch(
      `${baseUrl}/api/context?file=nonexistent.ts&start=1&end=5`
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("File not found");
  });

  test("clamps start line to minimum of 1", async () => {
    const res = await fetch(
      `${baseUrl}/api/context?file=index.ts&start=-5&end=3`
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lines[0].lineNum).toBe(1);
  });

  test("clamps end line to file length", async () => {
    const res = await fetch(
      `${baseUrl}/api/context?file=index.ts&start=1&end=99999`
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lines.length).toBe(data.totalLines);
    expect(data.lines[data.lines.length - 1].lineNum).toBe(data.totalLines);
  });

  test("returns correct content for each line", async () => {
    const res = await fetch(
      `${baseUrl}/api/context?file=index.ts&start=1&end=2`
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    // First line should be an import statement
    expect(data.lines[0].content).toContain("import");
  });

  test("handles single line request", async () => {
    const res = await fetch(
      `${baseUrl}/api/context?file=index.ts&start=5&end=5`
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lines.length).toBe(1);
    expect(data.lines[0].lineNum).toBe(5);
  });

  test("defaults to line 1 when start/end not provided", async () => {
    const res = await fetch(`${baseUrl}/api/context?file=index.ts`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lines.length).toBe(1);
    expect(data.lines[0].lineNum).toBe(1);
  });
});

describe("/api/diff", () => {
  test("returns 200 with diff and directory", async () => {
    const res = await fetch(`${baseUrl}/api/diff`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("diff");
    expect(data).toHaveProperty("directory");
    expect(typeof data.diff).toBe("string");
    expect(typeof data.directory).toBe("string");
  });

  test("returns the correct project directory", async () => {
    const res = await fetch(`${baseUrl}/api/diff`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.directory).toBe(projectRoot);
  });

  test("diff contains expected format when changes exist", async () => {
    const res = await fetch(`${baseUrl}/api/diff`);
    const data = await res.json();

    expect(res.status).toBe(200);
    // If there are changes, the diff should contain diff markers
    if (data.diff.length > 0) {
      expect(data.diff).toContain("diff --git");
    }
  });

  test("diff includes file path information", async () => {
    const res = await fetch(`${baseUrl}/api/diff`);
    const data = await res.json();

    expect(res.status).toBe(200);
    // If there are changes, they should have a/b path markers
    if (data.diff.length > 0) {
      expect(data.diff).toMatch(/^---\s+a\//m);
      expect(data.diff).toMatch(/^\+\+\+\s+b\//m);
    }
  });

  test("diff includes hunk headers when changes exist", async () => {
    const res = await fetch(`${baseUrl}/api/diff`);
    const data = await res.json();

    expect(res.status).toBe(200);
    // If there are changes, they should have @@ hunk markers
    if (data.diff.length > 0) {
      expect(data.diff).toMatch(/^@@\s+-\d+,?\d*\s+\+\d+,?\d*\s+@@/m);
    }
  });
});
