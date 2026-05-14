import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma, Role } from "@/generated/prisma/client";
import { SYSTEM_ADMIN_USERNAME, isSystemAdmin } from "@/lib/admin";
import {
  requireAdminJsonMutationRequest,
  requireAdminMutationRequest,
} from "@/lib/api-security";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { RedisUnavailableError } from "@/lib/redis";
import { clearUserSessionActivities } from "@/lib/session-activity";
import {
  PASSWORD_MESSAGE,
  PASSWORD_PATTERN,
  USERNAME_LENGTH_MESSAGE,
  USERNAME_MESSAGE,
  USERNAME_PATTERN,
} from "@/lib/validation";

const optionalProfileTextSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(100).nullable().optional(),
);

const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().email().max(254).nullable().optional(),
);

const updateUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, USERNAME_LENGTH_MESSAGE)
    .max(50, USERNAME_LENGTH_MESSAGE)
    .regex(USERNAME_PATTERN, USERNAME_MESSAGE)
    .optional(),
  password: z
    .string()
    .min(8, PASSWORD_MESSAGE)
    .max(128, PASSWORD_MESSAGE)
    .regex(PASSWORD_PATTERN, PASSWORD_MESSAGE)
    .optional(),
  role: z.enum(Role).optional(),
  email: optionalEmailSchema,
  position: optionalProfileTextSchema,
  department: optionalProfileTextSchema,
  isActive: z.boolean().optional(),
});

function getFirstValidationMessage(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const fieldLabels: Record<string, string> = {
    username: "Username",
    password: "Password",
    role: "Role",
    position: "Position",
    department: "Department",
    email: "Email",
    isActive: "Active status",
  };

  for (const field of Object.keys(fieldLabels)) {
    const message = fieldErrors[field]?.[0];

    if (message) {
      return `${fieldLabels[field]}: ${message}`;
    }
  }

  return "Invalid user data";
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { admin, data, response } = await requireAdminJsonMutationRequest(
    request,
    updateUserSchema,
    {
      formatInvalidResponse: (error) =>
        NextResponse.json(
          {
            message: getFirstValidationMessage(error),
            issues: error.flatten(),
          },
          { status: 400 },
        ),
    },
  );

  if (response) {
    return response;
  }

  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id } });

  if (!target) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (isSystemAdmin(target.username) && admin.role !== Role.SUPER_ADMIN) {
    return NextResponse.json(
      { message: "Only the super admin can update sys_admin" },
      { status: 403 },
    );
  }

  if (
    isSystemAdmin(target.username) &&
    data.username &&
    data.username !== target.username
  ) {
    return NextResponse.json(
      { message: "sys_admin username cannot be changed" },
      { status: 400 },
    );
  }

  if (!isSystemAdmin(target.username) && data.username === SYSTEM_ADMIN_USERNAME) {
    return NextResponse.json(
      { message: `${SYSTEM_ADMIN_USERNAME} is reserved for the super admin` },
      { status: 400 },
    );
  }

  if (!isSystemAdmin(target.username) && data.role === Role.SUPER_ADMIN) {
    return NextResponse.json(
      { message: "Only sys_admin can have the super admin role" },
      { status: 400 },
    );
  }

  if (target.id === admin.id && data.isActive === false) {
    return NextResponse.json(
      { message: "You cannot deactivate your own account" },
      { status: 400 },
    );
  }

  if (data.password && await verifyPassword(target.passwordHash, data.password)) {
    return NextResponse.json(
      { message: "New password must be different from the current password" },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        username: data.username,
        role: isSystemAdmin(target.username) ? Role.SUPER_ADMIN : data.role,
        email: data.email,
        position: data.position,
        department: data.department,
        isActive: isSystemAdmin(target.username) ? true : data.isActive,
        passwordHash: data.password ? await hashPassword(data.password) : undefined,
        mustChangePassword: data.password ? false : undefined,
      },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        position: true,
        department: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const shouldRevokeSessions =
      data.password ||
      data.isActive === false ||
      (data.role && data.role !== target.role);

    if (shouldRevokeSessions) {
      try {
        await clearUserSessionActivities(target.id);
      } catch (error) {
        if (error instanceof RedisUnavailableError) {
          return NextResponse.json(
            { message: "User updated, but session revocation failed" },
            { status: 503 },
          );
        }

        throw error;
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Username already exists" },
        { status: 409 },
      );
    }

    throw error;
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { admin, response } = await requireAdminMutationRequest(request);

  if (response) {
    return response;
  }

  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id } });

  if (!target) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (isSystemAdmin(target.username)) {
    return NextResponse.json(
      { message: "sys_admin cannot be deleted" },
      { status: 400 },
    );
  }

  if (target.id === admin.id) {
    return NextResponse.json(
      { message: "You cannot delete your own account" },
      { status: 400 },
    );
  }

  try {
    await clearUserSessionActivities(target.id);
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      return NextResponse.json(
        { message: "Session revocation is temporarily unavailable" },
        { status: 503 },
      );
    }

    throw error;
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
