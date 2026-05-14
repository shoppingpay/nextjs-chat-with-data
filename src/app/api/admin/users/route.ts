import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import {
  SYSTEM_ADMIN_USERNAME,
  isSystemAdmin,
  requireAdminUser,
} from "@/lib/admin";
import { requireAdminJsonMutationRequest } from "@/lib/api-security";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
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

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, USERNAME_LENGTH_MESSAGE)
    .max(50, USERNAME_LENGTH_MESSAGE)
    .regex(USERNAME_PATTERN, USERNAME_MESSAGE),
  password: z
    .string()
    .min(8, PASSWORD_MESSAGE)
    .max(128, PASSWORD_MESSAGE)
    .regex(PASSWORD_PATTERN, PASSWORD_MESSAGE),
  role: z.enum(Role).default(Role.USER),
  email: optionalEmailSchema,
  position: optionalProfileTextSchema,
  department: optionalProfileTextSchema,
});

function getRoleSortPriority(role: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN ? 0 : 1;
}

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
  };

  for (const field of Object.keys(fieldLabels)) {
    const message = fieldErrors[field]?.[0];

    if (message) {
      return `${fieldLabels[field]}: ${message}`;
    }
  }

  return "Invalid user data";
}

export async function GET() {
  const admin = await requireAdminUser();

  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const users = (await prisma.user.findMany({
    where: {
      username: { not: SYSTEM_ADMIN_USERNAME },
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
  })).sort((left, right) => {
    const roleDifference =
      getRoleSortPriority(left.role) - getRoleSortPriority(right.role);

    if (roleDifference !== 0) {
      return roleDifference;
    }

    const createdAtDifference =
      left.createdAt.getTime() - right.createdAt.getTime();

    if (createdAtDifference !== 0) {
      return createdAtDifference;
    }

    return left.id.localeCompare(right.id);
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const { data, response } = await requireAdminJsonMutationRequest(
    request,
    createUserSchema,
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

  const existing = await prisma.user.findUnique({
    where: { username: data.username },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Username already exists" },
      { status: 409 },
    );
  }

  if (isSystemAdmin(data.username)) {
    return NextResponse.json(
      { message: `${SYSTEM_ADMIN_USERNAME} is reserved for the super admin` },
      { status: 400 },
    );
  }

  if (data.role === Role.SUPER_ADMIN) {
    return NextResponse.json(
      { message: "Only sys_admin can have the super admin role" },
      { status: 400 },
    );
  }

  const user = await prisma.user.create({
    data: {
      username: data.username,
      passwordHash: await hashPassword(data.password),
      role: data.role,
      email: data.email,
      position: data.position,
      department: data.department,
      isActive: true,
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

  return NextResponse.json({ user }, { status: 201 });
}
