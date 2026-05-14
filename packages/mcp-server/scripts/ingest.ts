import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { getQdrantCollection } from "../src/env.js";
import { embedText } from "../src/lib/embedding.js";
import { ensureCollection, qdrant } from "../src/lib/qdrant.js";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function splitIntoChunks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end === normalized.length) break;
    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}

async function ingestFile(filePath: string) {
  const absolute = resolve(filePath);
  const raw = await readFile(absolute, "utf8");
  const chunks = splitIntoChunks(raw);

  if (chunks.length === 0) {
    process.stderr.write(`Skipping empty file: ${absolute}\n`);
    return;
  }

  const firstVector = await embedText(chunks[0]);
  const collection = getQdrantCollection();

  await ensureCollection(collection, firstVector.length);

  const client = qdrant();
  const points = [
    { id: randomUUID(), vector: firstVector, payload: { text: chunks[0], source: absolute } },
  ];

  for (let i = 1; i < chunks.length; i++) {
    const vector = await embedText(chunks[i]);
    points.push({
      id: randomUUID(),
      vector,
      payload: { text: chunks[i], source: absolute },
    });
  }

  await client.upsert(collection, { points, wait: true });
  process.stdout.write(`Ingested ${points.length} chunks from ${absolute}\n`);
}

async function main() {
  const files = process.argv.slice(2);

  if (files.length === 0) {
    process.stderr.write(
      "Usage: tsx scripts/ingest.ts <file1.txt> [file2.md ...]\n",
    );
    process.exit(1);
  }

  for (const file of files) {
    await ingestFile(file);
  }
}

main().catch((err) => {
  process.stderr.write(`Ingestion failed: ${err.message}\n`);
  process.exit(1);
});
