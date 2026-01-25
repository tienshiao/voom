# Voom

A local code review tool that displays git diffs in a web UI and generates prompts for LLM coding agents. It helps
put me in a code review mindset without needing me to commit and push first.

![Making comments](./images/commenting.png)

![Generating prompts](./images/prompt.png)

## About the name
I was reading *The Cat in the Hat Comes Back* to my son one night after working on this project. In the book, Voom
is a deus ex machina that is used to clean up pink spots. Which seems apt for a tool that helps clean up code generated
by Claude (my AI of choice).

## Features

- View uncommitted git changes (tracked and untracked files) in a GitHub-style diff viewer
- **Basic syntax highlighting** for 20+ languages (TypeScript, JavaScript, Python, Go, Rust, SQL, HTML/XML, and more)
- **Dark mode** with automatic system preference detection and manual toggle
- File tree sidebar with collapsible directories and filtering
- Word-level diff highlighting
- Image diff support
- Expandable context around diff hunks
- Add comments on any line
- Track files as viewed with progress indicator
- Generate markdown prompts from comments for AI coding assistants
- **No Feedback option** to exit without generating a prompt
- Single-file mode for large diffs (auto-enabled for 30+ files or 1500+ changed lines, with keyboard navigation via ←/→)
- Mobile-responsive design

## Requirements

Building Voom requires [Bun](https://bun.sh), a fast JavaScript runtime. Install it with:

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Or via Homebrew
brew install oven-sh/bun/bun
```

Once installed, the standalone binary has no runtime dependencies.

## Installation

### Standalone Binary (Recommended)

Build a standalone executable that requires no dependencies:

```bash
bun install
bun run build:voom        # Build for current platform
```

Then move the binary to your PATH:

```bash
# macOS/Linux
mv dist-executables/voom /usr/local/bin/

# Or add to a custom bin directory
mv dist-executables/voom ~/bin/
```

### Cross-Platform Builds

Build for all platforms at once:

```bash
bun run build:voom:all
```

This creates binaries in `dist-executables/`:
- `voom-macos-arm64` - macOS Apple Silicon
- `voom-macos-x64` - macOS Intel
- `voom-linux-x64` - Linux x64
- `voom-windows-x64.exe` - Windows x64

## Usage

### With Standalone Binary

```bash
# Review changes in current directory
voom

# Review changes in a specific directory
voom /path/to/repo

# Check version
voom --version
```

### With Bun (Development)

```bash
# Review changes in current directory
bun start

# Review changes in a specific directory
bun start /path/to/repo
```

The browser opens automatically. Add comments by clicking the + button on any diff line, then click "Prompt" to generate a formatted prompt for your AI assistant.

### With Claude Code

Voom integrates with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) to enable visual code review during an agentic session. Set up a skill to run Voom, review the changes and add comments in your browser, then send the feedback directly back to Claude Code.

#### Setup

Create a skill file at `~/.claude/commands/voom.md`:

```markdown
Please run the `voom` command to collect code review feedback. The command is user interactive, do not use a timeout.
Review the feedback and make necessary changes to the code to address the feedback.
```

**Alternative:** Run the install script:

```bash
bun run install:skill
```

#### Usage

Invoke the skill in Claude Code:

```
/voom
```

This opens the diff viewer. After reviewing:
1. Add comments on lines that need attention
2. Click "Prompt" to open the prompt modal
3. Click "Send to Claude Code" to send feedback and exit

When you click "Send to Claude Code", the prompt is printed to stdout and Voom exits, returning control to Claude Code with your feedback. Claude Code will then address the review comments.

Claude Code automatically sets the `CLAUDECODE` environment variable, which enables Claude Code mode:
- Suppresses startup output (so only your feedback is returned)
- Shows the "Send to Claude Code" button in the prompt modal

## Development

```bash
bun install
bun dev
```

## Configuration

- Default port: 3010 (auto-increments if in use)
- Set `PORT` environment variable to change default port
