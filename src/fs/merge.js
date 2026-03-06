import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const PARENT_PATH = fileURLToPath(new URL('.', import.meta.url));
const PARTS_DIR = join(PARENT_PATH, 'workspace', 'parts');
const OUTPUT_FILE = join(PARENT_PATH, 'workspace', 'merged.txt');

const parseFiles = () => {
  const idx = process.argv.indexOf('--files');
  if (idx === -1) return null;
  return process.argv[idx + 1].split(',').map((f) => f.trim());
};

const resolveFilePaths = async () => {
  try {
    await stat(PARTS_DIR);
  } catch {
    throw new Error('FS operation failed, something wrong with parts directory');
  }

  const requestedFiles = parseFiles();

  if (requestedFiles !== null) {
    const paths = requestedFiles.map((name) => join(PARTS_DIR, name));

    await Promise.all(
      paths.map(async (filePath) => {
        try {
          await stat(filePath);
        } catch {
          throw new Error(`FS operation failed, something wrong with file: ${filePath}`);
        }
      }),
    );

    return paths;
  }

  const dirents = await readdir(PARTS_DIR, { withFileTypes: true });
  const txtFiles = dirents
    .filter((dirent) => dirent.isFile() && extname(dirent.name) === '.txt')
    .map((dirent) => join(PARTS_DIR, dirent.name))
    .sort();

  if (txtFiles.length === 0) {
    throw new Error('FS operation failed, no .txt files found in parts directory');
  }

  return txtFiles;
};

const merge = async () => {
  const start = performance.now();

  const filePaths = await resolveFilePaths();
  const contents = await Promise.all(filePaths.map((f) => readFile(f, 'utf-8')));

  await writeFile(OUTPUT_FILE, contents.join(''), 'utf-8');

  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`✅ Merged ${filePaths.length} file(s) → ${OUTPUT_FILE} (${elapsed}ms)`);
};

await merge();
