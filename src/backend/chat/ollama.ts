import { Logger, ServiceUnavailableException } from "@nestjs/common";

import {
  getOllamaBaseUrl,
  getOllamaGuardrailModel,
  getOllamaRequestTimeoutMs,
} from "@/backend/chat/chat.env";

const logger = new Logger("Ollama");
const GENERIC_LLM_UNAVAILABLE = "AI service is temporarily unavailable.";

type OllamaChatResponse = {
  message?: { content?: string };
};

export async function callOllama(
  role: "guardrail",
  userMessage: string,
): Promise<string> {
  const model = getOllamaGuardrailModel();
  const baseUrl = getOllamaBaseUrl().replace(/\/$/, "");
  const url = `${baseUrl}/api/chat`;
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
        messages: [
          {
            role: "system",
            content:
              "These messages are sent by customers to a coffee shop chatbot. Reply YES if the chatbot should handle it (cafe-related: drinks, food, snacks, menu, price, hours, wifi, payment, promotions, orders, milk options, shop info). Reply NO if clearly unrelated (geography, science, coding, history, math). No explanation.",
          },
          { role: "user", content: userMessage },
        ],
        stream: false,
        options: { temperature: 0, think: false },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? "timed out"
        : (error as Error).message;

    logger.error(`Ollama guardrail failed (model=${model}, url=${url}): ${reason}`);
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

  let body: OllamaChatResponse;

  try {
    body = (await response.json()) as OllamaChatResponse;
  } catch (error) {
    logger.error(
      `Failed to parse Ollama response as JSON (model=${model}): ${(error as Error).message}`,
    );
    throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
  }

  return body.message?.content ?? "";
}
