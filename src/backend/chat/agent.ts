import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

import {
  getOllamaBaseUrl,
  getOllamaMainModel,
  getOllamaRequestTimeoutMs,
} from "@/backend/chat/chat.env";
import { McpClientService, type McpToolDefinition } from "@/backend/chat/mcp-client";

const MAX_TOOL_ITERATIONS = 4;
const GENERIC_LLM_UNAVAILABLE = "AI service is temporarily unavailable.";

type OllamaToolCall = {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
};

type OllamaChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
};

type OllamaChatResponse = {
  message?: OllamaChatMessage;
  done?: boolean;
};

function mcpToolToOllamaFormat(tool: McpToolDefinition) {
  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  };
}

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private readonly mcp: McpClientService) {}

  async run(userMessage: string, history: AgentMessage[]): Promise<string> {
    const tools = this.mcp.isReady() ? this.mcp.listTools() : [];
    const ollamaTools = tools.map(mcpToolToOllamaFormat);

    const messages: OllamaChatMessage[] = [
      {
        role: "system",
        content: [
          "You are a helpful coffee shop assistant. Answer in Thai unless the customer asks otherwise.",
          "Use the available tools to look up real data instead of guessing.",
          "If a tool returns success=false, explain politely and suggest contacting staff — do NOT fabricate answers.",
        ].join("\n"),
      },
      ...history.map<OllamaChatMessage>((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await this.callOllamaChat(messages, ollamaTools);
      const assistant = response.message;

      if (!assistant) {
        throw new ServiceUnavailableException(GENERIC_LLM_UNAVAILABLE);
      }

      if (!assistant.tool_calls || assistant.tool_calls.length === 0) {
        return assistant.content.trim() || "ขออภัย ไม่สามารถตอบได้ในขณะนี้";
      }

      messages.push(assistant);

      for (const call of assistant.tool_calls) {
        const toolResultJson = await this.mcp.callTool(
          call.function.name,
          call.function.arguments,
        );

        messages.push({ role: "tool", content: toolResultJson });
      }
    }

    this.logger.warn(`Agent exceeded ${MAX_TOOL_ITERATIONS} tool iterations.`);
    return "ขออภัย กระบวนการคิดวิเคราะห์ใช้เวลานานเกินไป กรุณาลองถามใหม่อีกครั้ง";
  }

  private async callOllamaChat(
    messages: OllamaChatMessage[],
    tools: ReturnType<typeof mcpToolToOllamaFormat>[],
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

    if (tools.length > 0) {
      body.tools = tools;
    }

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
