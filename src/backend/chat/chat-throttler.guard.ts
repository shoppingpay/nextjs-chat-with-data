import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

import type { AppSession } from "@/lib/session-store";

export class ChatThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(
    req: Record<string, unknown>,
  ): Promise<string> {
    const session = (req as { appSession?: AppSession }).appSession;
    if (session?.userId) {
      return `user:${session.userId}`;
    }
    const ip = req["ip"];
    return typeof ip === "string" ? ip : "anonymous";
  }
}

Injectable()(ChatThrottlerGuard);
