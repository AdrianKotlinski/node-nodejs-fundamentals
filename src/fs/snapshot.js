import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const PARENT_PATH = fileURLToPath(new URL('.', import.meta.url));
const WORKSPACE_DIR = join(PARENT_PATH, 'workspace');
const SNAPSHOT_PATH = join(PARENT_PATH, 'snapshot.json');

const collectEntries = async (rootPath) => {
  const dirents = await readdir(rootPath, { withFileTypes: true, recursive: true });

  return Promise.all(
    dirents.map(async (dirent) => {
      const absolutePath = join(dirent.parentPath, dirent.name);
      const relativePath = relative(rootPath, absolutePath);

      if (dirent.isDirectory()) {
        return { path: relativePath, type: 'directory' };
      }

      const [fileStat, fileBuffer] = await Promise.all([
        stat(absolutePath),
        readFile(absolutePath),
      ]);

      return {
        path: relativePath,
        type: 'file',
        size: fileStat.size,
        content: fileBuffer.toString('base64'),
      };
    }),
  );
};

const snapshot = async () => {
  try {
    await stat(WORKSPACE_DIR);
  } catch {
    throw new Error('FS operation failed');
  }

  const start = performance.now();

  const entries = await collectEntries(WORKSPACE_DIR);
  const snapshotData = { rootPath: WORKSPACE_DIR, entries };
  await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshotData, null, 2), 'utf-8');

  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`✅ Snapshot created → ${SNAPSHOT_PATH} (${elapsed}ms)`);
};

await snapshot();
