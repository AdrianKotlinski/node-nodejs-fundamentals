import { readdir, stat } from "fs/promises";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";

const PARENT_PATH = fileURLToPath(new URL(".", import.meta.url));
const WORKSPACE_DIR = join(PARENT_PATH, "workspace");

const parseExt = () => {
  const idx = process.argv.indexOf("--ext");
  if (idx === -1) return ".txt";
  const value = process.argv[idx + 1];
  return value.startsWith(".") ? value : `.${value}`;
};

const findByExt = async () => {
  try {
    await stat(WORKSPACE_DIR);
  } catch {
    throw new Error(
      "FS operation failed, something went wrong with workspace directory",
    );
  }

  const start = performance.now();

  const ext = parseExt();

  const dirents = await readdir(WORKSPACE_DIR, {
    withFileTypes: true,
    recursive: true,
  });

  const matches = dirents
    .filter((dirent) => dirent.isFile() && extname(dirent.name) === ext)
    .map((dirent) =>
      relative(WORKSPACE_DIR, join(dirent.parentPath, dirent.name)),
    )
    .sort();

  matches.forEach((filePath) => console.log(filePath));

  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`✅ Files with extension "${ext}" found → ${matches.length} (${elapsed}ms)`);
};

await findByExt();
