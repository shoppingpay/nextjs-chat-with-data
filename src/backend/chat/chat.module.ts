import { Module } from "@nestjs/common";

import { ChatController } from "@/backend/chat/chat.controller";
import { ChatService } from "@/backend/chat/chat.service";
import { ChatWorker } from "@/backend/chat/chat.worker";
import { MemoryService } from "@/backend/chat/memory.service";

export class ChatModule {}

Module({
  controllers: [ChatController],
  providers: [ChatService, MemoryService, ChatWorker],
})(ChatModule);
