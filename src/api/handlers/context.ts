export function createContextHandler(targetDir: string) {
  return {
    async GET(req: Request) {
      try {
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

        const fullPath = `${targetDir}/${filePath}`;
        const file = Bun.file(fullPath);

        if (!(await file.exists())) {
          return Response.json(
            { error: "File not found" },
            { status: 404 }
          );
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
      } catch (error) {
        return Response.json(
          {
            error: "Failed to read file context",
            message: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    },
  };
}
