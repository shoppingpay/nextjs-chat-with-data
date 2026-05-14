#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { closePool } from "./lib/postgres.js";
import {
  getSalesTimeseries,
  getSalesTimeseriesInputSchema,
} from "./tools/get-sales-timeseries.js";
import {
  searchCoffeeKnowledge,
  searchCoffeeKnowledgeInputSchema,
} from "./tools/search-coffee-knowledge.js";
import type { ToolResult } from "./types.js";

const TOOLS = [
  {
    name: "search_coffee_knowledge",
    description:
      "ค้นหาข้อมูลความรู้เกี่ยวกับร้านกาแฟ (เมนู, สินค้า, ส่วนผสม) จาก vector database",
    inputSchema: searchCoffeeKnowledgeInputSchema,
  },
  {
    name: "get_sales_timeseries",
    description:
      "ดึงข้อมูลยอดขายเป็น time-series (group by hour/day/week/month) จาก PostgreSQL",
    inputSchema: getSalesTimeseriesInputSchema,
  },
] as const;

function toToolContent(result: ToolResult): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
    isError: !result.success,
  };
}

async function dispatchTool(
  name: string,
  args: unknown,
): Promise<ToolResult> {
  const parsedArgs = (args ?? {}) as Record<string, unknown>;

  switch (name) {
    case "search_coffee_knowledge":
      return searchCoffeeKnowledge({
        query: String(parsedArgs.query ?? ""),
        limit:
          typeof parsedArgs.limit === "number" ? parsedArgs.limit : undefined,
      });

    case "get_sales_timeseries":
      return getSalesTimeseries({
        from: String(parsedArgs.from ?? ""),
        to: String(parsedArgs.to ?? ""),
        product:
          typeof parsedArgs.product === "string" ? parsedArgs.product : undefined,
        bucket:
          parsedArgs.bucket === "hour" ||
          parsedArgs.bucket === "day" ||
          parsedArgs.bucket === "week" ||
          parsedArgs.bucket === "month"
            ? parsedArgs.bucket
            : undefined,
      });

    default:
      return {
        success: false,
        error: { code: "UNKNOWN_TOOL", message: `Unknown tool: ${name}` },
      };
  }
}

async function main() {
  const server = new Server(
    { name: "coffee-shop-mcp-server", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await dispatchTool(
      request.params.name,
      request.params.arguments,
    );
    return toToolContent(result);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    await closePool().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  process.stderr.write(`MCP server fatal: ${err.message}\n`);
  process.exit(1);
});
