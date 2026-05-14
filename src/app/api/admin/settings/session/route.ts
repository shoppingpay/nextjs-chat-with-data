import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin";
import { requireAdminJsonMutationRequest } from "@/lib/api-security";
import { backendFetch } from "@/lib/backend-api";
import {
  getIdleTimeoutMinutes,
  MAX_IDLE_TIMEOUT_MINUTES,
  MIN_IDLE_TIMEOUT_MINUTES,
  setIdleTimeoutMinutes,
} from "@/lib/settings";

const sessionSettingsSchema = z.object({
  idleTimeoutMinutes: z
    .number()
    .int()
    .min(MIN_IDLE_TIMEOUT_MINUTES)
    .max(MAX_IDLE_TIMEOUT_MINUTES),
});

export async function GET() {
  const admin = await requireAdminUser();

  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const backendResponse = await backendFetch("/api/admin/settings/session");

  if (backendResponse) {
    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: "Backend session settings service unavailable" },
        { status: 502 },
      );
    }

    return NextResponse.json(await backendResponse.json());
  }

  return NextResponse.json({
    idleTimeoutMinutes: await getIdleTimeoutMinutes(),
    min: MIN_IDLE_TIMEOUT_MINUTES,
    max: MAX_IDLE_TIMEOUT_MINUTES,
  });
}

export async function PATCH(request: Request) {
  const { data, response } = await requireAdminJsonMutationRequest(
    request,
    sessionSettingsSchema,
    { invalidMessage: "Invalid session setting" },
  );

  if (response) {
    return response;
  }

  const backendResponse = await backendFetch("/api/admin/settings/session", {
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (backendResponse) {
    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: "Backend session settings service unavailable" },
        { status: 502 },
      );
    }

    return NextResponse.json(await backendResponse.json());
  }

  await setIdleTimeoutMinutes(data.idleTimeoutMinutes);

  return NextResponse.json({
    idleTimeoutMinutes: data.idleTimeoutMinutes,
  });
}
