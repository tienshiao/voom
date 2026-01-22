import { serve, type Server } from "bun";
import index from "./index.html";
import { createApiRoutes } from "./api/handlers/index";

// Configuration
const DEFAULT_PORT = parseInt(process.env.PORT || "3010", 10);
const MAX_PORT_ATTEMPTS = 10;

// Get target directory from CLI args or use CWD
const targetDir = Bun.argv[2] || process.cwd();

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
