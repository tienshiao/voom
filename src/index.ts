import { serve, type Server } from "bun";
import index from "./index.html";
import { createApiRoutes } from "./api/handlers/index";
import { resolveGitRoot, NotAGitRepoError } from "./api/utils";

// Configuration
const DEFAULT_PORT = parseInt(process.env.PORT || "3010", 10);
const MAX_PORT_ATTEMPTS = 10;
const CLAUDE_CODE_MODE = !!process.env.CLAUDECODE;

// Type guard for port-in-use errors
function isAddressInUseError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EADDRINUSE"
  );
}

(async () => {
  // Get input directory from CLI args or use CWD
  const inputDir = Bun.argv[2] || process.cwd();

  // Resolve to git repo root (fails fast if not a git repo)
  let targetDir: string;
  try {
    targetDir = await resolveGitRoot(inputDir);
    if (targetDir !== inputDir && !CLAUDE_CODE_MODE) {
      console.log(`Resolved to git root: ${targetDir}`);
    }
  } catch (error) {
    if (error instanceof NotAGitRepoError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  // Server configuration
  const serverConfig = {
    routes: {
      "/*": index,
      ...createApiRoutes(targetDir),
    },

    development: process.env.NODE_ENV !== "production" && {
      hmr: true,
      console: true,
    },
  };

  // Try to start server, falling back to next port if current is in use
  function startServerWithPortFallback(startPort: number): Server<unknown> {
    let currentPort = startPort;

    for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
      try {
        return serve({ ...serverConfig, port: currentPort });
      } catch (error) {
        if (isAddressInUseError(error)) {
          if (!CLAUDE_CODE_MODE) {
            console.warn(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
          }
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

  if (!CLAUDE_CODE_MODE) {
    if (server.port !== DEFAULT_PORT) {
      console.log(`Note: Default port ${DEFAULT_PORT} was in use`);
    }
    console.log(`Voom running at ${server.url}`);
  }

  // Open the browser automatically (cross-platform, fire-and-forget)
  const url = server.url.href;
  if (process.platform === "darwin") {
    Bun.spawn(["open", url]);
  } else if (process.platform === "win32") {
    Bun.spawn(["cmd", "/c", "start", url]);
  } else {
    Bun.spawn(["xdg-open", url]);
  }
})();
