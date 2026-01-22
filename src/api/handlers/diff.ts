import { unescapeGitPath } from "../utils";

async function getFullDiff(dir: string): Promise<string> {
  const unstagedDiff = await Bun.$`git -C ${dir} diff`.quiet().text();
  const stagedDiff = await Bun.$`git -C ${dir} diff --cached`.quiet().text();

  const untrackedResult = await Bun.$`git -C ${dir} ls-files --others --exclude-standard`.quiet();
  const untrackedFiles = untrackedResult.text().trim().split('\n').filter(Boolean).map(unescapeGitPath);

  const untrackedDiffs: string[] = [];
  for (const file of untrackedFiles) {
    const result = await Bun.$`git -C ${dir} diff --no-index /dev/null ${file}`.quiet().nothrow();
    if (result.stdout.length > 0) {
      untrackedDiffs.push(result.text());
    }
  }

  return unstagedDiff + stagedDiff + untrackedDiffs.join('');
}

export function createDiffHandler(targetDir: string) {
  return {
    async GET() {
      try {
        const diff = await getFullDiff(targetDir);
        return Response.json({
          diff,
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
  };
}
