# Voom - Local Code Review Tool

A web-based git diff viewer with commenting and LLM prompt generation.

## Project Structure

- `src/index.ts` - Bun server with `/api/diff` and `/api/context` endpoints
- `src/App.tsx` - Main React component
- `src/components/` - UI components (FileTree, DiffFile, PromptModal, etc.)
- `src/utils/` - Diff parsing, word diff, prompt generation
- `src/hooks/` - React hooks (useComments)
- `src/types/` - TypeScript type definitions

## Commands

```bash
bun dev          # Development with HMR
bun start        # Production server
bun test         # Run tests
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
