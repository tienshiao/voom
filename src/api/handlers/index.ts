import { createDiffHandler } from "./diff";
import { createContextHandler } from "./context";
import { createImageHandler, createGitImageHandler } from "./image";
import { createConfigHandler } from "./config";
import { createClaudeCodeHandler } from "./claudeCode";

export function createApiRoutes(targetDir: string) {
  return {
    "/api/diff": createDiffHandler(targetDir),
    "/api/context": createContextHandler(targetDir),
    "/api/image": createImageHandler(targetDir),
    "/api/image/git": createGitImageHandler(targetDir),
    "/api/config": createConfigHandler(),
    "/api/send-to-claude": createClaudeCodeHandler(),
  };
}
