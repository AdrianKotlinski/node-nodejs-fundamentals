import { createReadStream } from 'fs';
import { stat, readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';
import { fileURLToPath } from 'url';

const PARENT_PATH = fileURLToPath(new URL('.', import.meta.url));
const CHECKSUMS_PATH = join(PARENT_PATH, 'checksums.json');

const hashFile = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });

const verify = async () => {
  try {
    await stat(CHECKSUMS_PATH);
  } catch {
    throw new Error('FS operation failed');
  }

  const checksums = JSON.parse(await readFile(CHECKSUMS_PATH, 'utf-8'));

  await Promise.all(
    Object.entries(checksums).map(async ([filename, expectedHash]) => {
      const filePath = join(PARENT_PATH, filename);
      const actualHash = await hashFile(filePath);
      const status = actualHash === expectedHash ? 'OK' : 'FAIL';
      console.log(`${filename} — ${status}`);
    }),
  );
};

await verify();
