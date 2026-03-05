import { createReadStream, createWriteStream } from 'fs';
import { stat, mkdir } from 'fs/promises';
import { Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { createBrotliDecompress } from 'zlib';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const PARENT_PATH = fileURLToPath(new URL('.', import.meta.url));
const WORKSPACE_DIR = join(PARENT_PATH, 'workspace');
const ARCHIVE_PATH = join(WORKSPACE_DIR, 'compressed', 'archive.br');
const OUTPUT_DIR = join(WORKSPACE_DIR, 'decompressed');

const STATE_PATH = 'path';
const STATE_SIZE = 'size';
const STATE_CONTENT = 'content';

const createExtractor = (outputDir) => {
  let state = STATE_PATH;
  let lineBuffer = '';
  let currentPath = '';
  let remaining = 0;
  let currentWriter = null;

  const endWriter = () =>
    new Promise((resolve) => {
      if (currentWriter) {
        currentWriter.end(resolve);
        currentWriter = null;
      } else {
        resolve();
      }
    });

  return new Writable({
    async write(chunk, _encoding, callback) {
      try {
        let offset = 0;

        while (offset < chunk.length) {
          if (state === STATE_PATH || state === STATE_SIZE) {
            const newlineIdx = chunk.indexOf(0x0a, offset);

            if (newlineIdx === -1) {
              lineBuffer += chunk.slice(offset).toString();
              offset = chunk.length;
            } else {
              lineBuffer += chunk.slice(offset, newlineIdx).toString();
              offset = newlineIdx + 1;

              if (state === STATE_PATH) {
                currentPath = lineBuffer;
                lineBuffer = '';
                state = STATE_SIZE;
              } else {
                remaining = parseInt(lineBuffer, 10);
                lineBuffer = '';
                const filePath = join(outputDir, currentPath);
                await mkdir(dirname(filePath), { recursive: true });
                currentWriter = createWriteStream(filePath);
                state = STATE_CONTENT;
              }
            }
          } else {
            const toWrite = Math.min(chunk.length - offset, remaining);
            currentWriter.write(chunk.slice(offset, offset + toWrite));
            remaining -= toWrite;
            offset += toWrite;

            if (remaining === 0) {
              await endWriter();
              state = STATE_PATH;
            }
          }
        }

        callback();
      } catch (err) {
        callback(err);
      }
    },

    async final(callback) {
      try {
        await endWriter();
        callback();
      } catch (err) {
        callback(err);
      }
    },
  });
};

const decompressDir = async () => {
  try {
    await stat(ARCHIVE_PATH);
  } catch {
    throw new Error('FS operation failed');
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  await pipeline(
    createReadStream(ARCHIVE_PATH),
    createBrotliDecompress(),
    createExtractor(OUTPUT_DIR),
  );

  console.log(`✅ Decompressed → ${OUTPUT_DIR}`);
};

await decompressDir();
