import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { z } from "zod";

import { LOGIN_AUDIT_REASONS, recordLoginAudit } from "@/lib/audit-log";
import {
  clearFailedLoginAttempts,
  isLoginRateLimited,
  recordFailedLoginAttempt,
} from "@/lib/login-rate-limit";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { RedisUnavailableError } from "@/lib/redis";
import { getClientIp } from "@/lib/request-ip";
import { getRequestUserAgent } from "@/lib/request-metadata";
import {
  type AppSession,
  createServerSession,
  getSessionByToken,
  getSessionCookieName,
  readSessionTokenFromCookieHeader,
} from "@/lib/session-store";
import { getIdleTimeoutMinutes } from "@/lib/settings";

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

type HeaderReader = {
  get(name: string): string | null;
};

type AuthenticatedUser = {
  department: string | null;
  email: string | null;
  id: string;
  position: string | null;
  username: string;
  role: AppSession["role"];
  mustChangePassword: boolean;
};

async function failLogin(input: {
  username: string;
  ipAddress: string;
  reason:
    | typeof LOGIN_AUDIT_REASONS.USER_NOT_FOUND
    | typeof LOGIN_AUDIT_REASONS.USER_INACTIVE
    | typeof LOGIN_AUDIT_REASONS.INVALID_PASSWORD;
  userAgent: string | null;
  userId?: string | null;
}) {
  try {
    await recordFailedLoginAttempt(input.username, input.ipAddress);
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      await recordLoginAudit({
        username: input.username,
        userId: input.userId,
        success: false,
        reason: LOGIN_AUDIT_REASONS.REDIS_UNAVAILABLE,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      return null;
    }

    throw error;
  }

  await recordLoginAudit({
    username: input.username,
    userId: input.userId,
    success: false,
    reason: input.reason,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return null;
}

export async function authenticateWithPassword(input: {
  credentials: unknown;
  headers: HeaderReader;
}) {
  const parsed = credentialsSchema.safeParse(input.credentials);
  const ipAddress = getClientIp(input.headers);
  const userAgent = getRequestUserAgent(input.headers);

  if (!parsed.success) {
    await recordLoginAudit({
      username: "unknown",
      success: false,
      reason: LOGIN_AUDIT_REASONS.INVALID_REQUEST,
      ipAddress,
      userAgent,
    });
    return null;
  }

  try {
    if (await isLoginRateLimited(parsed.data.username, ipAddress)) {
      await recordLoginAudit({
        username: parsed.data.username,
        success: false,
        reason: LOGIN_AUDIT_REASONS.RATE_LIMITED,
        ipAddress,
        userAgent,
      });
      return null;
    }
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      await recordLoginAudit({
        username: parsed.data.username,
        success: false,
        reason: LOGIN_AUDIT_REASONS.REDIS_UNAVAILABLE,
        ipAddress,
        userAgent,
      });
      return null;
    }

    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
    },
  });

  if (!user) {
    return failLogin({
      username: parsed.data.username,
      reason: LOGIN_AUDIT_REASONS.USER_NOT_FOUND,
      ipAddress,
      userAgent,
    });
  }

  if (!user.isActive) {
    return failLogin({
      username: parsed.data.username,
      userId: user.id,
      reason: LOGIN_AUDIT_REASONS.USER_INACTIVE,
      ipAddress,
      userAgent,
    });
  }

  if (!(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return failLogin({
      username: parsed.data.username,
      userId: user.id,
      reason: LOGIN_AUDIT_REASONS.INVALID_PASSWORD,
      ipAddress,
      userAgent,
    });
  }

  try {
    const idleTimeoutMinutes = await getIdleTimeoutMinutes();
    const { token, session } = await createServerSession({
      userId: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      idleTimeoutMinutes,
    });

    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      clearFailedLoginAttempts(user.username, ipAddress),
    ]);

    await recordLoginAudit({
      username: user.username,
      userId: user.id,
      success: true,
      reason: LOGIN_AUDIT_REASONS.LOGIN_SUCCESS,
      ipAddress,
      userAgent,
    });

    return { token, session };
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      await recordLoginAudit({
        username: user.username,
        userId: user.id,
        success: false,
        reason: LOGIN_AUDIT_REASONS.SESSION_CREATE_FAILED,
        ipAddress,
        userAgent,
      });
      return null;
    }

    throw error;
  }
}

const getCachedCurrentSession = cache(async () => {
  const token = (await cookies()).get(getSessionCookieName())?.value;

  return getSessionByToken(token);
});

export async function getCurrentSession() {
  return getCachedCurrentSession();
}

export async function getCurrentSessionToken() {
  return (await cookies()).get(getSessionCookieName())?.value ?? null;
}

export async function getSessionFromRequest(request: Request) {
  return getSessionByToken(
    readSessionTokenFromCookieHeader(request.headers.get("cookie")),
  );
}

const getCachedAuthenticatedUser = cache(async (
  allowPasswordChangeRequired: boolean,
) => {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      department: true,
      email: true,
      username: true,
      position: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
    },
  });

  if (!user?.isActive) {
    return null;
  }

  if (user.mustChangePassword && !allowPasswordChangeRequired) {
    return null;
  }

  return {
    id: user.id,
    department: user.department,
    email: user.email,
    position: user.position,
    username: user.username,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  } satisfies AuthenticatedUser;
});

export async function getAuthenticatedUser(options?: {
  allowPasswordChangeRequired?: boolean;
}) {
  return getCachedAuthenticatedUser(Boolean(options?.allowPasswordChangeRequired));
}
