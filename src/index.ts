import { serve } from "bun";
import index from "./index.html";
import { createApiRoutes } from "./api/handlers/index";
import { resolveGitRoot, NotAGitRepoError } from "./api/utils";

// Version info (injected at build time)
declare const __VERSION__: string;
declare const __GIT_HASH__: string;

const VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";
const GIT_HASH = typeof __GIT_HASH__ !== "undefined" ? __GIT_HASH__ : "unknown";

// Handle --version flag
if (Bun.argv.includes("--version") || Bun.argv.includes("-v")) {
  console.log(`voom ${VERSION} (${GIT_HASH})`);
  process.exit(0);
}

// Configuration
const DEFAULT_PORT = parseInt(process.env.PORT || "3010", 10);
const MAX_PORT_ATTEMPTS = 10;
const CLAUDE_CODE_MODE = !!process.env.CLAUDECODE;

// Check if a port is available by attempting to connect to it
async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = Bun.connect({
      hostname: "localhost",
      port,
      socket: {
        open(socket) {
          // Connection succeeded - something is listening
          socket.end();
          resolve(true);
        },
        error() {
          // Connection failed - port is available
          resolve(false);
        },
        close() {},
        data() {},
      },
    }).catch(() => {
      // Connection refused - port is available
      resolve(false);
    });
  });
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

  // Find an available port, then start the server
  async function findAvailablePort(startPort: number): Promise<number> {
    let currentPort = startPort;

    for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
      if (await isPortInUse(currentPort)) {
        if (!CLAUDE_CODE_MODE) {
          console.warn(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
        }
        currentPort++;
      } else {
        return currentPort;
      }
    }

    throw new Error(
      `Failed to find available port after ${MAX_PORT_ATTEMPTS} attempts (tried ${startPort}-${startPort + MAX_PORT_ATTEMPTS - 1})`
    );
  }

  const availablePort = await findAvailablePort(DEFAULT_PORT);
  const server = serve({ ...serverConfig, port: availablePort });

  if (!CLAUDE_CODE_MODE) {
    if (server.port !== DEFAULT_PORT) {
      console.log(`Note: Default port ${DEFAULT_PORT} was in use`);
    }
    console.log(`Voom running at ${server.url}`);
  }

  // Wait for server to be fully ready, then open browser
  async function openBrowserWhenReady(url: string) {
    // Warm up the server by fetching the root page
    try {
      await fetch(url);
    } catch {
      // Ignore fetch errors - server should be ready since we just started it
    }

    // Now open the browser
    if (process.platform === "darwin") {
      Bun.spawn(["open", url]);
    } else if (process.platform === "win32") {
      Bun.spawn(["cmd", "/c", "start", url]);
    } else {
      Bun.spawn(["xdg-open", url]);
    }
  }

  // Open browser (fire-and-forget)
  openBrowserWhenReady(server.url.href);
})();
