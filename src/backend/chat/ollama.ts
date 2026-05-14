import { Logger, ServiceUnavailableException } from "@nestjs/common";

import {
  getOllamaBaseUrl,
  getOllamaGuardrailModel,
  getOllamaMainModel,
  getOllamaRequestTimeoutMs,
} from "@/backend/chat/chat.env";

const logger = new Logger("Ollama");
const GENERIC_LLM_UNAVAILABLE = "AI service is temporarily unavailable.";

type OllamaGenerateResponse = {
  response?: string;
};

export async function callOllama(
  role: "guardrail" | "main",
  prompt: string,
): Promise<string> {
  const model =
    role === "guardrail" ? getOllamaGuardrailModel() : getOllamaMainModel();
  const baseUrl = getOllamaBaseUrl().replace(/\/$/, "");
  const url = `${baseUrl}/api/generate`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    getOllamaRequestTimeoutMs(),
  );

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        ...(role === "guardrail" && { options: { num_predict: 1, temperature: 0.01 } }),
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? "timed out"
        : (error as Error).message;

    logger.error(`Ollama request failed (model=${model}, url=${url}): ${reason}`);
    throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    logger.error(
      `Ollama returned ${response.status} ${response.statusText} (model=${model}): ${detail}`,
    );
    throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
  }

  let body: OllamaGenerateResponse;

  try {
    body = (await response.json()) as OllamaGenerateResponse;
  } catch (error) {
    logger.error(
      `Failed to parse Ollama response as JSON (model=${model}): ${(error as Error).message}`,
    );
    throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
  }

  return body.response ?? "";
}
