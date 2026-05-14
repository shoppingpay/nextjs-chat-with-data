import { Module } from "@nestjs/common";

import { AgentService } from "@/backend/chat/agent";
import { ChatThrottlerGuard } from "@/backend/chat/chat-throttler.guard";
import { ChatController } from "@/backend/chat/chat.controller";
import { ChatService } from "@/backend/chat/chat.service";
import { ChatWorker } from "@/backend/chat/chat.worker";
import { McpClientService } from "@/backend/chat/mcp-client";
import { MemoryService } from "@/backend/chat/memory.service";

export class ChatModule {}

Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    MemoryService,
    McpClientService,
    AgentService,
    ChatWorker,
    ChatThrottlerGuard,
  ],
})(ChatModule);
