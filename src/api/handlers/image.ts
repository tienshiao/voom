import { getImageMimeType } from "../utils";

export function createImageHandler(targetDir: string) {
  return {
    async GET(req: Request) {
      try {
        const url = new URL(req.url);
        const filePath = url.searchParams.get("file");

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

        const mimeType = getImageMimeType(filePath);
        const data = await file.arrayBuffer();

        return new Response(data, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "no-cache",
          },
        });
      } catch (error) {
        return Response.json(
          {
            error: "Failed to read image",
            message: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    },
  };
}

export function createGitImageHandler(targetDir: string) {
  return {
    async GET(req: Request) {
      try {
        const url = new URL(req.url);
        const filePath = url.searchParams.get("file");
        const ref = url.searchParams.get("ref") || "HEAD";

        if (!filePath) {
          return Response.json(
            { error: "Missing file parameter" },
            { status: 400 }
          );
        }

        const result = await Bun.$`git -C ${targetDir} show ${ref}:${filePath}`.quiet().nothrow();

        if (result.exitCode !== 0) {
          return Response.json(
            { error: "File not found in git history" },
            { status: 404 }
          );
        }

        const mimeType = getImageMimeType(filePath);

        return new Response(new Uint8Array(result.stdout), {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "no-cache",
          },
        });
      } catch (error) {
        return Response.json(
          {
            error: "Failed to read image from git",
            message: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    },
  };
}
