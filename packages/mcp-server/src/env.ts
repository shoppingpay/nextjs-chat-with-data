function readTrimmed(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function required(name: string): string {
  const value = readTrimmed(name);
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function getOllamaBaseUrl(): string {
  return readTrimmed("OLLAMA_BASE_URL") ?? "http://localhost:11434";
}

export function getEmbeddingModel(): string {
  return readTrimmed("OLLAMA_EMBEDDING_MODEL") ?? "bge-m3";
}

export function getQdrantUrl(): string {
  return readTrimmed("QDRANT_URL") ?? "http://localhost:6333";
}

export function getQdrantCollection(): string {
  return readTrimmed("QDRANT_COLLECTION") ?? "coffee_knowledge";
}

export function getDatabaseUrl(): string {
  return required("DATABASE_URL");
}
