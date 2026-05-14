import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";

import { ChatThrottlerGuard } from "@/backend/chat/chat-throttler.guard";
import { ChatService } from "@/backend/chat/chat.service";
import { SessionGuard } from "@/backend/chat/session.guard";
import { InternalApiKeyGuard } from "@/backend/common/guards/internal-api-key.guard";
import type { AppSession } from "@/lib/session-store";

const MAX_MESSAGE_LENGTH = 2000;
const SESSION_ID_PATTERN = /^[\w-]{1,64}$/;

type SessionRequest = {
  appSession: AppSession;
};

type ChatRequestBody = {
  message?: unknown;
  sessionId?: unknown;
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

function normalizeSessionId(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string" || !SESSION_ID_PATTERN.test(value)) {
    throw new BadRequestException(
      "sessionId must be an alphanumeric string of 1–64 characters.",
    );
  }

  return value;
}

export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  async chat(body: ChatRequestBody, req: SessionRequest) {
    const message = normalizeMessage(body?.message);
    const sessionId = normalizeSessionId(body?.sessionId);
    return this.chatService.enqueue(req.appSession.userId, message, sessionId);
  }

  async getResult(params: { jobId: string }, req: SessionRequest) {
    return this.chatService.getResult(req.appSession.userId, params.jobId);
  }
}

Reflect.defineMetadata(
  "design:paramtypes",
  [ChatService],
  ChatController,
);
Controller("chat")(ChatController);
UseGuards(InternalApiKeyGuard, SessionGuard, ChatThrottlerGuard)(ChatController);

// POST /api/chat — 20 requests per minute per authenticated user
Post()(
  ChatController.prototype,
  "chat",
  Object.getOwnPropertyDescriptor(ChatController.prototype, "chat")!,
);
Body()(ChatController.prototype, "chat", 0);
Req()(ChatController.prototype, "chat", 1);
Throttle({ default: { limit: 20, ttl: 60_000 } })(
  ChatController.prototype,
  "chat",
  Object.getOwnPropertyDescriptor(ChatController.prototype, "chat")!,
);

// GET /api/chat/result/:jobId — polling endpoint, skip throttle
Get("result/:jobId")(
  ChatController.prototype,
  "getResult",
  Object.getOwnPropertyDescriptor(ChatController.prototype, "getResult")!,
);
Param()(ChatController.prototype, "getResult", 0);
Req()(ChatController.prototype, "getResult", 1);
SkipThrottle()(
  ChatController.prototype,
  "getResult",
  Object.getOwnPropertyDescriptor(ChatController.prototype, "getResult")!,
);
