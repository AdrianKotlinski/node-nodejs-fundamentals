import { Transform, Readable } from 'stream';
import { pipeline } from 'stream/promises';

const idx = process.argv.indexOf('--pattern');
const pattern = idx !== -1 ? process.argv[idx + 1] : null;

if (!pattern) {
  console.error('Usage: node filter.js --pattern <string>');
  process.exit(1);
}

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}

process.stdout.write(`\nExecute filter for input: ${JSON.stringify(input)}\n`);

const inputStream = Readable.from([input]);

const createFilter = (pat) => {
  let remainder = '';
  return new Transform({
    decodeStrings: false,
    transform(chunk, _encoding, callback) {
      const lines = (remainder + chunk).split('\n');
      remainder = lines.pop();
      for (const line of lines) {
        if (line.includes(pat)) {
          this.push(`${line}\n`);
        }
      }
      callback();
    },
    flush(callback) {
      if (remainder.length > 0 && remainder.includes(pat)) {
        this.push(`${remainder}\n`);
      }
      callback();
    },
  });
};

await pipeline(inputStream, createFilter(pattern), process.stdout);
