import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

import {
  getOllamaBaseUrl,
  getOllamaGuardrailModel,
  getOllamaMainModel,
  getOllamaRequestTimeoutMs,
} from "@/backend/chat/chat.env";

const OFF_TOPIC_REPLY =
  "ขออภัย ฉันตอบได้เฉพาะเรื่องที่เกี่ยวกับร้านกาแฟ (เมนู, สินค้า, ยอดขาย, สต็อก) เท่านั้น";
const GENERIC_LLM_UNAVAILABLE = "AI service is temporarily unavailable.";

export type ChatInput = {
  message: string;
};

export type ChatResult = {
  reply: string;
  inScope: boolean;
};

type OllamaGenerateResponse = {
  response?: string;
};

export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  async chat(input: ChatInput): Promise<ChatResult> {
    const inScope = await this.isInScope(input.message);

    if (!inScope) {
      return { reply: OFF_TOPIC_REPLY, inScope: false };
    }

    const reply = await this.generateReply(input.message);
    return { reply, inScope: true };
  }

  private async isInScope(message: string) {
    const prompt = [
      'You are a strict topic filter. Answer ONLY "YES" or "NO".',
      "Is the user message related to a coffee shop (menu, products, sales, stock, customers)?",
      `Message: "${message}"`,
      "Answer:",
    ].join("\n");

    const response = await this.callOllama(getOllamaGuardrailModel(), prompt);
    return response.trim().toUpperCase().startsWith("YES");
  }

  private async generateReply(message: string) {
    const prompt = [
      "You are a helpful coffee shop assistant. Answer in Thai unless the customer asks otherwise.",
      "Keep answers concise and grounded in coffee shop topics.",
      "",
      `Customer: ${message}`,
      "Assistant:",
    ].join("\n");

    const reply = (await this.callOllama(getOllamaMainModel(), prompt)).trim();

    if (!reply) {
      this.logger.error("Ollama returned an empty completion.");
      throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
    }

    return reply;
  }

  private async callOllama(model: string, prompt: string) {
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
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: controller.signal,
      });
    } catch (error) {
      const reason =
        error instanceof Error && error.name === "AbortError"
          ? "timed out"
          : (error as Error).message;

      this.logger.error(
        `Ollama request failed (model=${model}, url=${url}): ${reason}`,
      );
      throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");

      this.logger.error(
        `Ollama returned ${response.status} ${response.statusText} (model=${model}): ${detail}`,
      );
      throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
    }

    let body: OllamaGenerateResponse;

    try {
      body = (await response.json()) as OllamaGenerateResponse;
    } catch (error) {
      this.logger.error(
        `Failed to parse Ollama response as JSON (model=${model}): ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
    }

    return body.response ?? "";
  }
}

Reflect.defineMetadata("design:paramtypes", [], ChatService);
Injectable()(ChatService);
