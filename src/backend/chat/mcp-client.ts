import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { getMcpServerArgs, getMcpServerCommand } from "@/backend/chat/chat.env";

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
};

export class McpClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpClientService.name);
  private client: Client | undefined;
  private tools: McpToolDefinition[] = [];
  private ready = false;

  async onModuleInit() {
    try {
      const transport = new StdioClientTransport({
        command: getMcpServerCommand(),
        args: getMcpServerArgs(),
        env: { ...process.env } as Record<string, string>,
      });

      this.client = new Client(
        { name: "nextjs-chat-backend", version: "0.1.0" },
        { capabilities: {} },
      );

      await this.client.connect(transport);

      const listed = await this.client.listTools();
      this.tools = listed.tools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
        inputSchema: t.inputSchema ?? { type: "object" },
      }));
      this.ready = true;

      this.logger.log(
        `MCP client ready — ${this.tools.length} tool(s) discovered: ${this.tools
          .map((t) => t.name)
          .join(", ")}`,
      );
    } catch (error) {
      this.logger.error(
        `MCP client failed to initialise: ${(error as Error).message}. ` +
          "Agent will fall back to direct LLM responses.",
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close().catch(() => undefined);
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  listTools(): McpToolDefinition[] {
    return this.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    if (!this.client || !this.ready) {
      return JSON.stringify({
        success: false,
        error: {
          code: "MCP_UNAVAILABLE",
          message: "MCP client is not ready.",
        },
      });
    }

    try {
      const result = await this.client.callTool({
        name,
        arguments: args,
      });

      const textBlock = (result.content as Array<{ type: string; text?: string }>)?.find(
        (c) => c.type === "text",
      );

      return textBlock?.text ?? JSON.stringify({ success: true, data: null });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: {
          code: "TOOL_CALL_FAILED",
          message: (error as Error).message,
        },
      });
    }
  }
}

Reflect.defineMetadata("design:paramtypes", [], McpClientService);
Injectable()(McpClientService);
