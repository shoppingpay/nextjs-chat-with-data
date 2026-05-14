import { Module } from "@nestjs/common";

import { ChatController } from "@/backend/chat/chat.controller";
import { ChatService } from "@/backend/chat/chat.service";

export class ChatModule {}

Module({
  controllers: [ChatController],
  providers: [ChatService],
})(ChatModule);
