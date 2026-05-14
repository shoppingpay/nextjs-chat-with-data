import { Injectable, Logger } from "@nestjs/common";

import { redis } from "@/lib/redis";

const CHAT_HISTORY_TTL_SECONDS = 30 * 60;
const MAX_HISTORY_MESSAGES = 20;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function historyKey(userId: string, sessionId: string) {
  return `chat:${userId}:${sessionId}`;
}

export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  async getHistory(userId: string, sessionId: string): Promise<ChatMessage[]> {
    try {
      const raw = await redis.get(historyKey(userId, sessionId));

      if (!raw) {
        return [];
      }

      return JSON.parse(raw) as ChatMessage[];
    } catch (error) {
      this.logger.warn(
        `Failed to load history for ${userId}/${sessionId}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async appendHistory(
    userId: string,
    sessionId: string,
    userMessage: string,
    assistantReply: string,
  ): Promise<void> {
    const history = await this.getHistory(userId, sessionId);

    history.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantReply },
    );

    const trimmed = history.slice(-MAX_HISTORY_MESSAGES);

    try {
      await redis.setex(
        historyKey(userId, sessionId),
        CHAT_HISTORY_TTL_SECONDS,
        JSON.stringify(trimmed),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to save history for ${userId}/${sessionId}: ${(error as Error).message}`,
      );
    }
  }

  async clearHistory(userId: string, sessionId: string): Promise<void> {
    await redis.del(historyKey(userId, sessionId));
  }
}

Reflect.defineMetadata("design:paramtypes", [], MemoryService);
Injectable()(MemoryService);
