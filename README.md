# Voom

A local code review tool that displays git diffs in a web UI and generates prompts for LLM coding agents. It helps
put me in a code review mindset without needing me to commit and push first.

![Making comments](./images/commenting.png)

![Generating prompts](./images/prompt.png)

## About the name
I was reading The Cat in the Hat Comes Back to my son one night after working on this project. In the book, Voom
is a deus ex machina that is used to clean up pink spots. Which seems apt for a tool that helps clean up code generated
by Claude (my AI of choice).

## Features

- View uncommitted git changes (tracked and untracked files) in a GitHub-style diff viewer
- File tree sidebar with collapsible directories and filtering
- Word-level diff highlighting
- Image diff support
- Expandable context around diff hunks
- Add comments on any line
- Track files as viewed with progress indicator
- Generate markdown prompts from comments for AI coding assistants
- Single-file mode for large diffs (auto-enabled for 30+ files or 1500+ changed lines, with keyboard navigation via ←/→)

## Usage

```bash
# Review changes in current directory
bun start

# Review changes in a specific directory
bun start /path/to/repo
```

The browser opens automatically. Add comments by clicking the + button on any diff line, then click "Prompt" to generate a formatted prompt for your AI assistant.

## Development

```bash
bun install
bun dev
```

## Configuration

- Default port: 3010 (auto-increments if in use)
- Set `PORT` environment variable to change default port
