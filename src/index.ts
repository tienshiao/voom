import { serve, type Server } from "bun";
import index from "./index.html";

// Get full diff including untracked files
async function getFullDiff(dir: string): Promise<string> {
  // 1. Get regular diff for tracked files
  const trackedDiff = await Bun.$`git -C ${dir} diff`.quiet().text();

  // 2. Get list of untracked files
  const untrackedResult = await Bun.$`git -C ${dir} ls-files --others --exclude-standard`.quiet();
  const untrackedFiles = untrackedResult.text().trim().split('\n').filter(Boolean);

  // 3. Generate diff for each untracked file
  const untrackedDiffs: string[] = [];
  for (const file of untrackedFiles) {
    const filePath = `${dir}/${file}`;
    // git diff --no-index exits with 1 when files differ, so we handle that
    const result = await Bun.$`git diff --no-index /dev/null ${filePath}`.quiet().nothrow();
    if (result.stdout.length > 0) {
      // Fix paths in the diff output (replace /dev/null and absolute paths)
      let diff = result.text();
      diff = diff.replace(/a\/dev\/null/g, 'a/' + file);
      diff = diff.replace(new RegExp('b' + filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'b/' + file);
      untrackedDiffs.push(diff);
    }
  }

  return trackedDiff + untrackedDiffs.join('');
}

// Configuration
const DEFAULT_PORT = parseInt(process.env.PORT || "3010", 10);
const MAX_PORT_ATTEMPTS = 10;

// Get target directory from CLI args or use CWD
const targetDir = Bun.argv[2] || process.cwd();

// Server configuration (without port, which is handled by fallback logic)
const serverConfig = {
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/diff": {
      async GET(req: Request) {
        try {
          const diff = await getFullDiff(targetDir);
          return Response.json({
            diff,
            directory: targetDir,
          });
        } catch (error) {
          return Response.json(
            {
              error: "Failed to get git diff",
              message: error instanceof Error ? error.message : String(error),
              directory: targetDir,
            },
            { status: 500 }
          );
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
};

// Type guard for port-in-use errors
function isAddressInUseError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EADDRINUSE"
  );
}

// Try to start server, falling back to next port if current is in use
function startServerWithPortFallback(startPort: number): Server {
  let currentPort = startPort;

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
    try {
      return serve({ ...serverConfig, port: currentPort });
    } catch (error) {
      if (isAddressInUseError(error)) {
        console.warn(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
        currentPort++;
      } else {
        throw error;
      }
    }
  }

  throw new Error(
    `Failed to find available port after ${MAX_PORT_ATTEMPTS} attempts (tried ${startPort}-${startPort + MAX_PORT_ATTEMPTS - 1})`
  );
}

const server = startServerWithPortFallback(DEFAULT_PORT);

if (server.port !== DEFAULT_PORT) {
  console.log(`Note: Default port ${DEFAULT_PORT} was in use`);
}
console.log(`Server running at ${server.url}`);

// Open the browser automatically (cross-platform)
const url = server.url.href;
if (process.platform === "darwin") {
  await Bun.$`open ${url}`.quiet();
} else if (process.platform === "win32") {
  await Bun.$`cmd /c start ${url}`.quiet();
} else {
  await Bun.$`xdg-open ${url}`.quiet();
}
