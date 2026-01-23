# Voom - Local Code Review Tool

A web-based git diff viewer with commenting and LLM prompt generation.

## Project Structure

- `src/index.ts` - Bun server entry point with port fallback and browser auto-open
- `src/api/handlers/` - API route handlers
  - `index.ts` - Route factory creating `/api/diff`, `/api/context`, `/api/image`, `/api/image/git`
  - `diff.ts` - Git diff endpoint
  - `context.ts` - File context endpoint
  - `image.ts` - Image serving endpoints (filesystem and git blob)
- `src/App.tsx` - Main React component
- `src/components/` - UI components
  - `FileTree.tsx` - File navigation sidebar
  - `DiffFile.tsx` - Diff viewer with line-by-line display
  - `ImageDiff.tsx` - Side-by-side image comparison
  - `PromptModal.tsx` - LLM prompt generation modal
  - `CommentInput.tsx`, `CommentDisplay.tsx` - Comment UI
  - `FileIcon.tsx` - File type icons
- `src/utils/` - Utilities (parseDiff, wordDiff, generatePrompt)
- `src/hooks/` - React hooks (useComments)
- `src/types/` - TypeScript types

## Commands

```bash
bun dev              # Development with HMR
bun start            # Production server
bun test             # Run tests
bun run build        # Build frontend to dist/
bun run build:voom   # Compile standalone binary
```

## Bun Conventions

- Use `bun` instead of `node`, `npm`, `yarn`
- Use `Bun.serve()` with routes (not express)
- Use `Bun.file()` for file operations
- Use `Bun.$\`cmd\`` for shell commands
- Bun auto-loads `.env` files
- HTML imports work directly with React/CSS

## Testing

```ts
import { test, expect } from "bun:test";

test("example", () => {
  expect(1).toBe(1);
});
```
