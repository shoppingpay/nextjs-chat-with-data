import { createHash, randomBytes } from "node:crypto";

import type { Role } from "@/generated/prisma/client";
import { getFrontendOrigin } from "@/lib/env";
import { ensureRedisReady, redis } from "@/lib/redis";
import { getIdleTimeoutMinutes } from "@/lib/settings";

export const SESSION_ABSOLUTE_TIMEOUT_SECONDS = 8 * 60 * 60;

const SESSION_PREFIX = "session:opaque";
const USER_SESSIONS_PREFIX = "user:sessions";
const TTL_BUFFER_SECONDS = 30;
const LOCAL_COOKIE_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export type AppSession = {
  id: string;
  userId: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
};

export type CreateSessionInput = {
  userId: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
  idleTimeoutMinutes?: number;
};

export type SessionCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  priority: "high";
};

function isLocalUrl(url: URL) {
  return LOCAL_COOKIE_HOSTNAMES.has(url.hostname);
}

export function shouldUseSecureSessionCookie() {
  const configuredUrl = getFrontendOrigin();
  const isProduction = process.env.NODE_ENV === "production";

  if (!configuredUrl) {
    return isProduction;
  }

  const parsedUrl = new URL(configuredUrl);

  if (isProduction && !isLocalUrl(parsedUrl) && parsedUrl.protocol !== "https:") {
    throw new Error("NEXTAUTH_URL must use HTTPS in production.");
  }

  return parsedUrl.protocol === "https:";
}

export function getSessionCookieName() {
  return shouldUseSecureSessionCookie() ? "__Host-md_session" : "md_session";
}

export function getSessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: shouldUseSecureSessionCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_ABSOLUTE_TIMEOUT_SECONDS,
    priority: "high",
  };
}

export function getExpiredSessionCookieOptions(): SessionCookieOptions {
  return {
    ...getSessionCookieOptions(),
    maxAge: 0,
  };
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function getSessionKey(sessionHash: string) {
  return `${SESSION_PREFIX}:${sessionHash}`;
}

function getUserSessionsKey(userId: string) {
  return `${USER_SESSIONS_PREFIX}:${userId}`;
}

function getSessionTtlSeconds(session: AppSession, idleTimeoutMinutes: number) {
  const absoluteTtlSeconds = Math.max(
    0,
    Math.ceil((session.expiresAt - Date.now()) / 1000),
  );
  const idleTtlSeconds = idleTimeoutMinutes * 60 + TTL_BUFFER_SECONDS;

  return Math.min(absoluteTtlSeconds, idleTtlSeconds);
}

async function extendUserSessionsIndexTtl(userId: string, ttlSeconds: number) {
  const userSessionsKey = getUserSessionsKey(userId);

  try {
    await redis.call("EXPIRE", userSessionsKey, ttlSeconds, "GT");
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!message.includes("syntax error")) {
      throw error;
    }
  }

  const currentTtlSeconds = await redis.ttl(userSessionsKey);

  if (currentTtlSeconds < 0 || currentTtlSeconds < ttlSeconds) {
    await redis.expire(userSessionsKey, ttlSeconds);
  }
}

function parseSession(raw: string | null): AppSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSession>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.username !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.mustChangePassword !== "boolean" ||
      typeof parsed.createdAt !== "number" ||
      typeof parsed.lastActivityAt !== "number" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return parsed as AppSession;
  } catch {
    return null;
  }
}

function isSessionExpired(session: AppSession, idleTimeoutMinutes: number) {
  const now = Date.now();

  return (
    session.expiresAt <= now ||
    now - session.lastActivityAt >= idleTimeoutMinutes * 60 * 1000
  );
}

export async function createServerSession(input: CreateSessionInput) {
  await ensureRedisReady();

  const token = createOpaqueToken();
  const sessionHash = hashSessionToken(token);
  const now = Date.now();
  const idleTimeoutMinutes =
    input.idleTimeoutMinutes ?? (await getIdleTimeoutMinutes());
  const session: AppSession = {
    id: sessionHash,
    userId: input.userId,
    username: input.username,
    role: input.role,
    mustChangePassword: input.mustChangePassword,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + SESSION_ABSOLUTE_TIMEOUT_SECONDS * 1000,
  };
  const ttlSeconds = getSessionTtlSeconds(session, idleTimeoutMinutes);

  await redis.set(getSessionKey(sessionHash), JSON.stringify(session), "EX", ttlSeconds);
  await redis.sadd(getUserSessionsKey(input.userId), sessionHash);
  await extendUserSessionsIndexTtl(input.userId, ttlSeconds);

  return { token, session };
}

export async function getSessionByToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  await ensureRedisReady();

  const sessionHash = hashSessionToken(token);
  const session = parseSession(await redis.get(getSessionKey(sessionHash)));

  if (!session) {
    return null;
  }

  const idleTimeoutMinutes = await getIdleTimeoutMinutes();

  if (isSessionExpired(session, idleTimeoutMinutes)) {
    await clearSessionByHash(sessionHash, session.userId);
    return null;
  }

  return session;
}

export async function touchServerSession(
  token: string,
  idleTimeoutMinutes?: number,
) {
  await ensureRedisReady();

  const sessionHash = hashSessionToken(token);
  const session = parseSession(await redis.get(getSessionKey(sessionHash)));

  if (!session) {
    return null;
  }

  const timeoutMinutes = idleTimeoutMinutes ?? (await getIdleTimeoutMinutes());

  if (isSessionExpired(session, timeoutMinutes)) {
    await clearSessionByHash(sessionHash, session.userId);
    return null;
  }

  const nextSession = {
    ...session,
    lastActivityAt: Date.now(),
  };
  const ttlSeconds = getSessionTtlSeconds(nextSession, timeoutMinutes);

  if (ttlSeconds <= 0) {
    await clearSessionByHash(sessionHash, session.userId);
    return null;
  }

  await redis.set(getSessionKey(sessionHash), JSON.stringify(nextSession), "EX", ttlSeconds);
  await redis.sadd(getUserSessionsKey(session.userId), sessionHash);
  await extendUserSessionsIndexTtl(session.userId, ttlSeconds);

  return nextSession;
}

export async function updateServerSession(input: {
  token: string;
  mustChangePassword?: boolean;
  role?: Role;
  username?: string;
}) {
  await ensureRedisReady();

  const sessionHash = hashSessionToken(input.token);
  const session = parseSession(await redis.get(getSessionKey(sessionHash)));

  if (!session) {
    return null;
  }

  const timeoutMinutes = await getIdleTimeoutMinutes();
  const nextSession: AppSession = {
    ...session,
    username: input.username ?? session.username,
    role: input.role ?? session.role,
    mustChangePassword:
      input.mustChangePassword ?? session.mustChangePassword,
  };
  const ttlSeconds = getSessionTtlSeconds(nextSession, timeoutMinutes);

  if (ttlSeconds <= 0) {
    await clearSessionByHash(sessionHash, session.userId);
    return null;
  }

  await redis.set(getSessionKey(sessionHash), JSON.stringify(nextSession), "EX", ttlSeconds);

  return nextSession;
}

export async function clearSessionByToken(token: string | undefined | null) {
  if (!token) {
    return;
  }

  await ensureRedisReady();

  const sessionHash = hashSessionToken(token);
  const session = parseSession(await redis.get(getSessionKey(sessionHash)));

  await clearSessionByHash(sessionHash, session?.userId);
}

async function clearSessionByHash(sessionHash: string, userId?: string) {
  if (userId) {
    await redis.srem(getUserSessionsKey(userId), sessionHash);
  }

  await redis.del(getSessionKey(sessionHash));
}

export async function clearUserServerSessions(userId: string) {
  await ensureRedisReady();

  const userSessionsKey = getUserSessionsKey(userId);
  const sessionHashes = await redis.smembers(userSessionsKey);

  if (sessionHashes.length > 0) {
    await redis.del(...sessionHashes.map((sessionHash) => getSessionKey(sessionHash)));
  }

  await redis.del(userSessionsKey);
}

export function readSessionTokenFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const cookieName = getSessionCookieName();
  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name === cookieName) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}
