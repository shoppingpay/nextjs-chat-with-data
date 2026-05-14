import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

import {
  getOllamaBaseUrl,
  getOllamaMainModel,
  getOllamaRequestTimeoutMs,
} from "@/backend/chat/chat.env";
import { McpClientService } from "@/backend/chat/mcp-client";

const GENERIC_LLM_UNAVAILABLE = "AI service is temporarily unavailable.";

type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OllamaChatResponse = {
  message?: OllamaChatMessage;
  done?: boolean;
};

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private readonly mcp: McpClientService) {}

  async run(userMessage: string, history: AgentMessage[]): Promise<string> {
    // Naive RAG: pre-fetch relevant context and inject into system prompt.
    // Avoids the slow multi-turn tool-calling loop for non-fast models.
    const contextBlock = await this.fetchContext(userMessage);

    const systemContent = [
      "You are a helpful coffee shop assistant. Answer in Thai unless the customer asks otherwise.",
      "Do NOT fabricate answers. If you don't have relevant information, say so politely.",
      ...(contextBlock ? ["---", "Relevant information from the knowledge base:", contextBlock, "---"] : []),
    ].join("\n");

    const messages: OllamaChatMessage[] = [
      { role: "system", content: systemContent },
      ...history.map<OllamaChatMessage>((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    const response = await this.callOllamaChat(messages);
    const assistant = response.message;

    if (!assistant) {
      throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
    }

    return assistant.content.trim() || "ขออภัย ไม่สามารถตอบได้ในขณะนี้";
  }

  private async fetchContext(query: string): Promise<string> {
    if (!this.mcp.isReady()) return "";

    try {
      const raw = await this.mcp.callTool("search_coffee_knowledge", { query, limit: 3 });
      const parsed = JSON.parse(raw) as { success?: boolean; data?: Array<{ text: string; score: number }> };
      if (!parsed.success || !Array.isArray(parsed.data) || parsed.data.length === 0) return "";
      return parsed.data.map((h) => h.text).join("\n\n");
    } catch {
      return "";
    }
  }

  private async callOllamaChat(
    messages: OllamaChatMessage[],
  ): Promise<OllamaChatResponse> {
    const baseUrl = getOllamaBaseUrl().replace(/\/$/, "");
    const url = `${baseUrl}/api/chat`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      getOllamaRequestTimeoutMs(),
    );

    const body: Record<string, unknown> = {
      model: getOllamaMainModel(),
      messages,
      stream: false,
    };

    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const reason =
        error instanceof Error && error.name === "AbortError"
          ? "timed out"
          : (error as Error).message;
      this.logger.error(`Ollama /api/chat failed (${url}): ${reason}`);
      throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.error(
        `Ollama /api/chat ${response.status} ${response.statusText}: ${detail}`,
      );
      throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
    }

    try {
      return (await response.json()) as OllamaChatResponse;
    } catch (error) {
      this.logger.error(
        `Failed to parse /api/chat response: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
    }
  }
}

Reflect.defineMetadata("design:paramtypes", [McpClientService], AgentService);
Injectable()(AgentService);
