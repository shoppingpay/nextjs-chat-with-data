import { NextResponse } from "next/server";
import { z } from "zod";

import {
  RequestBodyTooLargeError,
  isSameOriginRequest,
  readJson,
} from "@/lib/api-security";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const optionalProfileTextSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(100).nullable().optional(),
);

const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().email().max(254).nullable().optional(),
);

const updateProfileSchema = z.object({
  department: optionalProfileTextSchema,
  email: optionalEmailSchema,
  position: optionalProfileTextSchema,
});

function getFirstValidationMessage(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const fieldLabels: Record<string, string> = {
    department: "Department",
    email: "Email",
    position: "Position",
  };

  for (const field of Object.keys(fieldLabels)) {
    const message = fieldErrors[field]?.[0];

    if (message) {
      return `${fieldLabels[field]}: ${message}`;
    }
  }

  return "Invalid profile data";
}

export async function GET() {
  const sessionUser = await getAuthenticatedUser({
    allowPasswordChangeRequired: true,
  });

  if (!sessionUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: sessionUser });
}

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "Cross-origin profile updates are not allowed" },
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

  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: getFirstValidationMessage(parsed.error),
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      department: parsed.data.department,
      email: parsed.data.email,
      position: parsed.data.position,
    },
    select: {
      department: true,
      email: true,
      id: true,
      mustChangePassword: true,
      position: true,
      role: true,
      username: true,
    },
  });

  return NextResponse.json({ user });
}
