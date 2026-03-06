import { createReadStream, createWriteStream } from 'fs';
import { stat, readdir, mkdir } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createBrotliCompress } from 'zlib';
import { fileURLToPath } from 'url';
import { join, relative } from 'path';

const PARENT_PATH = fileURLToPath(new URL('.', import.meta.url));
const WORKSPACE_DIR = join(PARENT_PATH, 'workspace');
const SOURCE_DIR = join(WORKSPACE_DIR, 'toCompress');
const OUTPUT_DIR = join(WORKSPACE_DIR, 'compressed');
const ARCHIVE_PATH = join(OUTPUT_DIR, 'archive.br');

const collectFiles = async (dir, base = dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(abs, base));
    } else {
      files.push(relative(base, abs));
    }
  }
  return files;
};

async function* archiveEntries(relPaths, baseDir) {
  for (const relPath of relPaths) {
    const absPath = join(baseDir, relPath);
    const { size } = await stat(absPath);
    yield `${relPath}\n${size}\n`;
    for await (const chunk of createReadStream(absPath)) {
      yield chunk;
    }
  }
}

const compressDir = async () => {
  try {
    await stat(SOURCE_DIR);
  } catch {
    throw new Error('FS operation failed');
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const relPaths = await collectFiles(SOURCE_DIR);
  const archiveStream = Readable.from(archiveEntries(relPaths, SOURCE_DIR));

  await pipeline(
    archiveStream,
    createBrotliCompress(),
    createWriteStream(ARCHIVE_PATH),
  );

  console.log(`✅ Compressed ${relPaths.length} file(s) → ${ARCHIVE_PATH}`);
};

await compressDir();
