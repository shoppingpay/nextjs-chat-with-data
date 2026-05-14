import { QdrantClient } from "@qdrant/js-client-rest";

import { getQdrantUrl } from "../env.js";

let _client: QdrantClient | undefined;

export function qdrant(): QdrantClient {
  if (!_client) {
    _client = new QdrantClient({ url: getQdrantUrl() });
  }
  return _client;
}

export async function ensureCollection(name: string, vectorSize: number) {
  const client = qdrant();
  const existing = await client.getCollections();

  if (existing.collections.some((c) => c.name === name)) {
    return;
  }

  await client.createCollection(name, {
    vectors: { size: vectorSize, distance: "Cosine" },
  });
}
