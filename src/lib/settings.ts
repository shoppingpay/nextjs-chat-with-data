import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_IDLE_TIMEOUT_MINUTES,
  MAX_IDLE_TIMEOUT_MINUTES,
  MIN_IDLE_TIMEOUT_MINUTES,
  normalizeIdleTimeoutMinutes,
  SESSION_IDLE_TIMEOUT_KEY,
} from "@/lib/session-policy";

export {
  DEFAULT_IDLE_TIMEOUT_MINUTES,
  MAX_IDLE_TIMEOUT_MINUTES,
  MIN_IDLE_TIMEOUT_MINUTES,
  SESSION_IDLE_TIMEOUT_KEY,
};

const IDLE_TIMEOUT_CACHE_TTL_MS = 30 * 1000;

let idleTimeoutCache:
  | {
      expiresAt: number;
      value: number;
    }
  | undefined;

export async function getIdleTimeoutMinutes() {
  if (idleTimeoutCache && idleTimeoutCache.expiresAt > Date.now()) {
    return idleTimeoutCache.value;
  }

  const setting = await prisma.systemSetting.findUnique({
    where: { key: SESSION_IDLE_TIMEOUT_KEY },
  });

  const normalized = normalizeIdleTimeoutMinutes(setting?.value);
  const value = normalized ?? DEFAULT_IDLE_TIMEOUT_MINUTES;
  idleTimeoutCache = {
    expiresAt: Date.now() + IDLE_TIMEOUT_CACHE_TTL_MS,
    value,
  };

  return value;
}

export async function setIdleTimeoutMinutes(minutes: number) {
  const normalized = normalizeIdleTimeoutMinutes(minutes);

  if (!normalized) {
    throw new Error(
      `Idle timeout must be between ${MIN_IDLE_TIMEOUT_MINUTES} and ${MAX_IDLE_TIMEOUT_MINUTES} minutes.`,
    );
  }

  const setting = await prisma.systemSetting.upsert({
    where: { key: SESSION_IDLE_TIMEOUT_KEY },
    update: { value: String(normalized) },
    create: {
      key: SESSION_IDLE_TIMEOUT_KEY,
      value: String(normalized),
    },
  });
  idleTimeoutCache = {
    expiresAt: Date.now() + IDLE_TIMEOUT_CACHE_TTL_MS,
    value: normalized,
  };

  return setting;
}
