import { createDiffHandler } from "./diff";
import { createContextHandler } from "./context";
import { createImageHandler, createGitImageHandler } from "./image";

export function createApiRoutes(targetDir: string) {
  return {
    "/api/diff": createDiffHandler(targetDir),
    "/api/context": createContextHandler(targetDir),
    "/api/image": createImageHandler(targetDir),
    "/api/image/git": createGitImageHandler(targetDir),
  };
}
