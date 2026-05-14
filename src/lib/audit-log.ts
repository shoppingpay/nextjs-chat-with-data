import "server-only";

import { prisma } from "@/lib/prisma";
import { parseUserAgent } from "@/lib/request-metadata";

export const LOGIN_AUDIT_REASONS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGOUT_SUCCESS: "LOGOUT_SUCCESS",
  INVALID_REQUEST: "INVALID_REQUEST",
  RATE_LIMITED: "RATE_LIMITED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_INACTIVE: "USER_INACTIVE",
  INVALID_PASSWORD: "INVALID_PASSWORD",
  REDIS_UNAVAILABLE: "REDIS_UNAVAILABLE",
  SESSION_CREATE_FAILED: "SESSION_CREATE_FAILED",
} as const;

type LoginAuditReason =
  (typeof LOGIN_AUDIT_REASONS)[keyof typeof LOGIN_AUDIT_REASONS];

type RecordLoginAuditInput = {
  username: string;
  userId?: string | null;
  success: boolean;
  reason: LoginAuditReason;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function recordLoginAudit(input: RecordLoginAuditInput) {
  const userAgentDetails = parseUserAgent(input.userAgent);

  try {
    await prisma.loginAuditLog.create({
      data: {
        username: input.username.trim().slice(0, 100) || "unknown",
        userId: input.userId,
        success: input.success,
        reason: input.reason,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        operatingSystem: userAgentDetails.operatingSystem,
        clientType: userAgentDetails.clientType,
      },
    });
  } catch {
    // Audit logging must not become an authentication outage.
  }
}
