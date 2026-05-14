import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/backend/prisma/prisma.service";
import {
  DEFAULT_IDLE_TIMEOUT_MINUTES,
  normalizeIdleTimeoutMinutes,
  SESSION_IDLE_TIMEOUT_KEY,
} from "@/lib/session-policy";

const IDLE_TIMEOUT_CACHE_TTL_MS = 30 * 1000;

export class SettingsService {
  private idleTimeoutCache:
    | {
        expiresAt: number;
        value: number;
      }
    | undefined;

  constructor(private readonly prisma: PrismaService) {}

  async getIdleTimeoutMinutes() {
    if (this.idleTimeoutCache && this.idleTimeoutCache.expiresAt > Date.now()) {
      return this.idleTimeoutCache.value;
    }

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SESSION_IDLE_TIMEOUT_KEY },
    });
    const normalized = normalizeIdleTimeoutMinutes(setting?.value);
    const value = normalized ?? DEFAULT_IDLE_TIMEOUT_MINUTES;

    this.idleTimeoutCache = {
      expiresAt: Date.now() + IDLE_TIMEOUT_CACHE_TTL_MS,
      value,
    };

    return value;
  }

  async setIdleTimeoutMinutes(minutes: number) {
    const normalized = normalizeIdleTimeoutMinutes(minutes);

    if (!normalized) {
      throw new Error("Invalid idle timeout value.");
    }

    const setting = await this.prisma.systemSetting.upsert({
      where: { key: SESSION_IDLE_TIMEOUT_KEY },
      update: { value: String(normalized) },
      create: {
        key: SESSION_IDLE_TIMEOUT_KEY,
        value: String(normalized),
      },
    });

    this.idleTimeoutCache = {
      expiresAt: Date.now() + IDLE_TIMEOUT_CACHE_TTL_MS,
      value: normalized,
    };

    return setting;
  }
}

Reflect.defineMetadata("design:paramtypes", [PrismaService], SettingsService);
Injectable()(SettingsService);
