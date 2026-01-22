// build-all.ts
import { build } from "bun";
import * as fs from "fs";
import * as path from "path";

const entrypoint = "./src/index.ts"; // Replace with your entry file
const outdir = "./dist-executables";

const platforms = [
  { platform: "darwin", arch: "x64", target: "bun-darwin-x64", outfile: "voom-macos-x64" },
  { platform: "darwin", arch: "arm64", target: "bun-darwin-arm64", outfile: "voom-macos-arm64" },
  { platform: "linux", arch: "x64", target: "bun-linux-x64", outfile: "voom-linux-x64" },
  { platform: "win", arch: "x64", target: "bun-windows-x64", outfile: "voom-windows-x64.exe" },
];

// Ensure the output directory exists
if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

console.log(`Starting cross-compilation for ${entrypoint}...`);

for (const platform of platforms) {
  const outputPath = path.join(outdir, platform.outfile);
  console.log(`Building for ${platform.target} -> ${outputPath}`);

  try {
    await build({
      entrypoints: [entrypoint],
      compile: {
        target: platform.target as any,
	outfile: platform.outfile
      },
      minify: true,
      outdir,
    });
    console.log(`✅ Successfully built for ${platform.target}`);
  } catch (error) {
    console.error(`❌ Failed to build for ${platform.target}:`, error);
  }
}

console.log("All builds complete.");
