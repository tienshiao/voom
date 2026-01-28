import { unescapeGitPath } from "../utils";

async function getFullDiff(dir: string): Promise<string> {
  // Start all git commands in parallel, with untracked file diffs chained to ls-files
  const [unstagedDiff, stagedDiff, untrackedDiffs] = await Promise.all([
    Bun.$`git -C ${dir} diff`.quiet().text(),
    Bun.$`git -C ${dir} diff --cached`.quiet().text(),
    Bun.$`git -C ${dir} ls-files --others --exclude-standard`.quiet().then(async (result) => {
      const untrackedFiles = result.text().trim().split('\n').filter(Boolean).map(unescapeGitPath);
      return Promise.all(
        untrackedFiles.map(async (file) => {
          const diff = await Bun.$`git -C ${dir} diff --no-index /dev/null ${file}`.quiet().nothrow();
          return diff.stdout.length > 0 ? diff.text() : '';
        })
      );
    }),
  ]);

  return unstagedDiff + stagedDiff + untrackedDiffs.join('');
}

export function createDiffHandler(targetDir: string) {
  return {
    async GET() {
      try {
        const diff = await getFullDiff(targetDir);
        const hash = Bun.hash(diff).toString(16);
        return Response.json({
          diff,
          directory: targetDir,
          hash,
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
  };
}

export function createStatusHandler(targetDir: string) {
  return {
    async GET() {
      try {
        const diff = await getFullDiff(targetDir);
        const hash = Bun.hash(diff).toString(16);
        return Response.json({ hash });
      } catch (error) {
        return Response.json(
          {
            error: "Failed to get status",
            message: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    },
  };
}
