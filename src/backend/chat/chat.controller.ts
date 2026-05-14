import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";

import { ChatService } from "@/backend/chat/chat.service";
import { SessionGuard } from "@/backend/chat/session.guard";
import { InternalApiKeyGuard } from "@/backend/common/guards/internal-api-key.guard";

const MAX_MESSAGE_LENGTH = 2000;

type ChatRequestBody = {
  message?: unknown;
};

function normalizeMessage(value: unknown) {
  if (typeof value !== "string") {
    throw new BadRequestException("message must be a string.");
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new BadRequestException("message must not be empty.");
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new BadRequestException(
      `message must not exceed ${MAX_MESSAGE_LENGTH} characters.`,
    );
  }

  return trimmed;
}

export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  async chat(body: ChatRequestBody) {
    const message = normalizeMessage(body?.message);
    return this.chatService.chat({ message });
  }
}

Reflect.defineMetadata("design:paramtypes", [ChatService], ChatController);
Controller("chat")(ChatController);
UseGuards(InternalApiKeyGuard, SessionGuard)(ChatController);
Post()(
  ChatController.prototype,
  "chat",
  Object.getOwnPropertyDescriptor(ChatController.prototype, "chat")!,
);
Body()(ChatController.prototype, "chat", 0);
