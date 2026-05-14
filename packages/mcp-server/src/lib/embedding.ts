import { getEmbeddingModel, getOllamaBaseUrl } from "../env.js";

type OllamaEmbeddingResponse = {
  embedding?: number[];
};

export async function embedText(text: string): Promise<number[]> {
  const baseUrl = getOllamaBaseUrl().replace(/\/$/, "");
  const model = getEmbeddingModel();

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama embedding failed: ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as OllamaEmbeddingResponse;

  if (!Array.isArray(json.embedding) || json.embedding.length === 0) {
    throw new Error("Ollama embedding response missing 'embedding' array.");
  }

  return json.embedding;
}
