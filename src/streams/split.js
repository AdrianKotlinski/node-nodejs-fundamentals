import { createReadStream, createWriteStream } from 'fs';
import { stat } from 'fs/promises';
import { Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { join } from 'path';

const PARENT_PATH = fileURLToPath(new URL('.', import.meta.url));
const SOURCE_FILE = join(PARENT_PATH, 'source.txt');

const idx = process.argv.indexOf('--lines');
const linesPerChunk = idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 10;

process.stdout.write(`\nExecute split for input [source.txt]: ${linesPerChunk} lines per chunk\n`);


const createSplitter = (maxLines, outputDir) => {
  let remainder = '';
  let chunkIndex = 1;
  let lineCount = 0;
  let writer = createWriteStream(join(outputDir, `chunk_${chunkIndex}.txt`));

  const rotateChunk = () => {
    writer.end();
    chunkIndex++;
    lineCount = 0;
    writer = createWriteStream(join(outputDir, `chunk_${chunkIndex}.txt`));
  };

  return new Writable({
    decodeStrings: false,
    write(chunk, _encoding, callback) {
      const lines = (remainder + chunk).split('\n');
      remainder = lines.pop();
      for (const line of lines) {
        if (lineCount >= maxLines) rotateChunk();
        writer.write(`${line}\n`);
        lineCount++;
      }
      callback();
    },
    final(callback) {
      if (remainder.length > 0) {
        if (lineCount >= maxLines) rotateChunk();
        writer.write(remainder);
      }
      writer.end(callback);
    },
  });
};

const split = async () => {
  try {
    await stat(SOURCE_FILE);
  } catch {
    throw new Error('FS operation failed, smth went wrong with source file');
  }

  const readable = createReadStream(SOURCE_FILE, { encoding: 'utf8' });
  await pipeline(readable, createSplitter(linesPerChunk, PARENT_PATH));
  console.log(`✅ Split complete → ${linesPerChunk} lines/chunk`, );
};

await split();
