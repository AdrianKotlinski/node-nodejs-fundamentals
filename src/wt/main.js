import { Worker } from "worker_threads";
import { readFile } from "fs/promises";
import { availableParallelism } from "os";
import { fileURLToPath } from "url";
import { join } from "path";

const PARENT_PATH = fileURLToPath(new URL(".", import.meta.url));
const DATA_PATH = join(PARENT_PATH, "data.json");
const WORKER_PATH = new URL("./worker.js", import.meta.url);

const splitIntoChunks = (arr, n) => {
  const size = Math.ceil(arr.length / n);
  return Array.from({ length: n }, (_, i) =>
    arr.slice(i * size, (i + 1) * size),
  ).filter((chunk) => chunk.length > 0);
};

class MinHeap {
  constructor() {
    this.heap = [];
  }

  get size() {
    return this.heap.length;
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].value <= this.heap[i].value) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].value < this.heap[smallest].value)
        smallest = left;
      if (right < n && this.heap[right].value < this.heap[smallest].value)
        smallest = right;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

const kWayMerge = (sortedChunks) => {
  const heap = new MinHeap();
  const pointers = new Array(sortedChunks.length).fill(0);
  const result = [];

  for (let i = 0; i < sortedChunks.length; i++) {
    if (sortedChunks[i].length > 0) {
      heap.push({ value: sortedChunks[i][0], chunkIndex: i });
      pointers[i] = 1;
    }
  }

  while (heap.size > 0) {
    const { value, chunkIndex } = heap.pop();
    result.push(value);
    const nextIdx = pointers[chunkIndex];
    if (nextIdx < sortedChunks[chunkIndex].length) {
      heap.push({ value: sortedChunks[chunkIndex][nextIdx], chunkIndex });
      pointers[chunkIndex]++;
    }
  }

  return result;
};

const runWorker = (chunk) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH);
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.postMessage(chunk);
  });

const main = async () => {
  const numbers = JSON.parse(await readFile(DATA_PATH, "utf8"));
  const cpuCount = availableParallelism();
  const chunks = splitIntoChunks(numbers, cpuCount);

  console.log(
    `Sorting ${numbers.length} numbers across ${chunks.length} workers (${cpuCount} CPUs)`,
  );

  const sortedChunks = await Promise.all(chunks.map(runWorker));
  const sorted = kWayMerge(sortedChunks);

  console.log("Sorted:", sorted);
  process.exit(0);
};

await main();
