import "server-only";

import Redis from "ioredis";

import { getRedisUrl } from "@/lib/env";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

const REDIS_READY_CACHE_TTL_MS = 10 * 1000;
let redisReadyUntil = 0;

export class RedisUnavailableError extends Error {
  constructor(message = "Redis is unavailable.") {
    super(message);
    this.name = "RedisUnavailableError";
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        reject(new RedisUnavailableError("Redis operation timed out."));
      }, timeoutMs);
    }),
  ]);
}

function createRedisClient() {
  const redisUrl = getRedisUrl();

  const client = new Redis(redisUrl, {
    commandTimeout: 1000,
    connectTimeout: 1000,
    family: 4,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy() {
      return null;
    },
  });

  client.on("error", () => {
    // Request handlers convert Redis failures into controlled auth failures.
  });

  return client;
}

function getRedisClient() {
  if (!globalForRedis.redis) {
    globalForRedis.redis = createRedisClient();
  }

  return globalForRedis.redis;
}

export const redis = new Proxy({} as Redis, {
  get(_target, property) {
    const client = getRedisClient();
    const value = Reflect.get(client, property, client);

    return typeof value === "function" ? value.bind(client) : value;
  },
});

export async function ensureRedisReady() {
  const client = getRedisClient();

  try {
    if (client.status === "ready" && redisReadyUntil > Date.now()) {
      return;
    }

    if (
      client.status === "wait" ||
      client.status === "end" ||
      client.status === "close"
    ) {
      await withTimeout(client.connect(), 1200);
    }

    await withTimeout(client.ping(), 1200);
    redisReadyUntil = Date.now() + REDIS_READY_CACHE_TTL_MS;
  } catch (error) {
    redisReadyUntil = 0;
    throw new RedisUnavailableError(
      error instanceof Error ? error.message : undefined,
    );
  }
}
