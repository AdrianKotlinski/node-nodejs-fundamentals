import { Transform, Readable } from 'stream';
import { pipeline } from 'stream/promises';

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}

process.stdout.write(`\nExecute lineNumbered for input: ${JSON.stringify(input)}\n`);

const inputStream = Readable.from([input]);

const createLineNumberer = () => {
  let lineNumber = 1;
  let remainder = '';

  return new Transform({
    decodeStrings: false,

    transform(chunk, _encoding, callback) {
      const lines = (remainder + chunk).split('\n');
      remainder = lines.pop();

      for (const line of lines) {
        this.push(`${lineNumber++} | ${line}\n`);
      }

      callback();
    },

    flush(callback) {
      if (remainder.length > 0) {
        this.push(`${lineNumber} | ${remainder}\n`);
      }
      callback();
    },
  });
};

await pipeline(inputStream, createLineNumberer(), process.stdout);
