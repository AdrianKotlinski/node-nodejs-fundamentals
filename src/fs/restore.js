import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const PARENT_PATH = fileURLToPath(new URL('.', import.meta.url));
const SNAPSHOT_PATH = join(PARENT_PATH, 'snapshot.json');
const RESTORE_DIR = join(PARENT_PATH, 'workspace_restored');

const restore = async () => {
  try {
    await stat(SNAPSHOT_PATH);
  } catch {
    throw new Error('FS operation failed, something went wrong with snapshot file');
  }

  const start = performance.now();

  const raw = await readFile(SNAPSHOT_PATH, 'utf-8');
  const { entries } = JSON.parse(raw);

  await rm(RESTORE_DIR, { recursive: true, force: true });
  await mkdir(RESTORE_DIR);

  const directories = entries.filter(({ type }) => type === 'directory');
  const files = entries.filter(({ type }) => type === 'file');

  await Promise.all(
    directories.map(({ path }) => mkdir(join(RESTORE_DIR, path), { recursive: true })),
  );

  await Promise.all(
    files.map(({ path, content }) => writeFile(join(RESTORE_DIR, path), Buffer.from(content, 'base64'))),
  );

  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`✅ Restore complete → ${RESTORE_DIR} (${elapsed}ms)`);
};

await restore();
