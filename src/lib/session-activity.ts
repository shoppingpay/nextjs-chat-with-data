import "server-only";

import type { Role } from "@/generated/prisma/client";
import {
  clearSessionByToken,
  clearUserServerSessions,
  getSessionByToken,
  touchServerSession,
} from "@/lib/session-store";

export async function touchSessionActivity(input: {
  sessionId: string;
  userId: string;
  username: string;
  role: Role;
  idleTimeoutMinutes?: number;
}) {
  return touchServerSession(input.sessionId, input.idleTimeoutMinutes);
}

export async function getSessionActivity(sessionId: string) {
  return getSessionByToken(sessionId);
}

export async function isSessionIdleExpired(
  sessionId: string,
  idleTimeoutMinutes?: number,
) {
  return !(await touchServerSession(sessionId, idleTimeoutMinutes));
}

export async function clearSessionActivity(sessionId: string) {
  await clearSessionByToken(sessionId);
}

export async function clearUserSessionActivities(userId: string) {
  await clearUserServerSessions(userId);
}
