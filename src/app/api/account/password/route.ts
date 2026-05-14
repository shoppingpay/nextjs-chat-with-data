import { NextResponse } from "next/server";
import { z } from "zod";

import {
  RequestBodyTooLargeError,
  isSameOriginRequest,
  readJson,
} from "@/lib/api-security";
import {
  getAuthenticatedUser,
} from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  clearUserServerSessions,
  createServerSession,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/session-store";
import { getIdleTimeoutMinutes } from "@/lib/settings";
import {
  PASSWORD_MESSAGE,
  PASSWORD_PATTERN,
} from "@/lib/validation";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, PASSWORD_MESSAGE)
    .max(128, PASSWORD_MESSAGE)
    .regex(PASSWORD_PATTERN, PASSWORD_MESSAGE),
});

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "Cross-origin password changes are not allowed" },
      { status: 403 },
    );
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { message: "Expected application/json" },
      { status: 415 },
    );
  }

  const sessionUser = await getAuthenticatedUser({
    allowPasswordChangeRequired: true,
  });

  if (!sessionUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await readJson(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { message: "Request body is too large" },
        { status: 413 },
      );
    }

    throw error;
  }

  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.flatten().fieldErrors.newPassword?.[0] ?? "Invalid password data" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    return NextResponse.json(
      { message: "Current password is incorrect" },
      { status: 400 },
    );
  }

  if (await verifyPassword(user.passwordHash, parsed.data.newPassword)) {
    return NextResponse.json(
      { message: "New password must be different from the current password" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      mustChangePassword: false,
      passwordHash: await hashPassword(parsed.data.newPassword),
    },
  });

  await clearUserServerSessions(sessionUser.id);

  const { token } = await createServerSession({
    userId: sessionUser.id,
    username: sessionUser.username,
    role: sessionUser.role,
    mustChangePassword: false,
    idleTimeoutMinutes: await getIdleTimeoutMinutes(),
  });
  const response = NextResponse.json({ ok: true });

  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());

  return response;
}
