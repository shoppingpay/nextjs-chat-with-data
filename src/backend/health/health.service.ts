import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";

import { PrismaService } from "@/backend/prisma/prisma.service";
import { getOllamaBaseUrl } from "@/backend/chat/chat.env";
import { getRedisUrl } from "@/lib/env";

export type CheckStatus = "ok" | "error";

export type HealthDetail = {
  ok: boolean;
  service: string;
  timestamp: string;
  checks: {
    postgres: CheckStatus;
    redis: CheckStatus;
    ollama: CheckStatus;
    qdrant: CheckStatus;
  };
};

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthDetail> {
    const [postgres, redis, ollama, qdrant] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkOllama(),
      this.checkQdrant(),
    ]);

    const ok =
      postgres === "ok" &&
      redis === "ok" &&
      ollama === "ok" &&
      qdrant === "ok";

    return {
      ok,
      service: "nest-backend",
      timestamp: new Date().toISOString(),
      checks: { postgres, redis, ollama, qdrant },
    };
  }

  private async checkPostgres(): Promise<CheckStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch (err) {
      this.logger.warn(`Postgres health check failed: ${(err as Error).message}`);
      return "error";
    }
  }

  private async checkRedis(): Promise<CheckStatus> {
    const redis = new Redis(getRedisUrl(), {
      connectTimeout: 2000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
      lazyConnect: true,
      family: 4,
    });

    try {
      await redis.connect();
      const pong = await redis.ping();
      return pong === "PONG" ? "ok" : "error";
    } catch (err) {
      this.logger.warn(`Redis health check failed: ${(err as Error).message}`);
      return "error";
    } finally {
      redis.disconnect();
    }
  }

  private async checkOllama(): Promise<CheckStatus> {
    try {
      const url = `${getOllamaBaseUrl()}/api/tags`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok ? "ok" : "error";
    } catch (err) {
      this.logger.warn(`Ollama health check failed: ${(err as Error).message}`);
      return "error";
    }
  }

  private async checkQdrant(): Promise<CheckStatus> {
    const baseUrl = (process.env["QDRANT_URL"] ?? "http://localhost:6333").replace(/\/$/, "");

    try {
      const res = await fetch(`${baseUrl}/healthz`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok ? "ok" : "error";
    } catch (err) {
      this.logger.warn(`Qdrant health check failed: ${(err as Error).message}`);
      return "error";
    }
  }
}

Reflect.defineMetadata("design:paramtypes", [PrismaService], HealthService);
