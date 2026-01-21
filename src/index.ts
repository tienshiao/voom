import { serve } from "bun";
import index from "./index.html";

// Get target directory from CLI args or use CWD
const targetDir = Bun.argv[2] || process.cwd();

const server = serve({
  port: 3010,
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/api/diff": {
      async GET(req) {
        try {
          const result = await Bun.$`git -C ${targetDir} diff`.quiet();
          return Response.json({
            diff: result.text(),
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
});

console.log(`🚀 Server running at ${server.url}`);
