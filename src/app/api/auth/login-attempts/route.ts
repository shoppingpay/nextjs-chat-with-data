import { NextResponse } from "next/server";
import { z } from "zod";

import { isSameOriginRequest, readJson } from "@/lib/api-security";
import { getLoginAttemptStatus } from "@/lib/login-rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { RedisUnavailableError } from "@/lib/redis";

const loginAttemptStatusSchema = z.object({
  username: z.string().trim().min(1),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "Cross-origin login status requests are not allowed" },
      { status: 403 },
    );
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { message: "Expected application/json" },
      { status: 415 },
    );
  }

  const parsed = loginAttemptStatusSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid username" }, { status: 400 });
  }

  try {
    const ipAddress = getClientIp(request.headers);

    return NextResponse.json(
      await getLoginAttemptStatus(parsed.data.username, ipAddress),
    );
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      return NextResponse.json(
        { message: "Login status is temporarily unavailable" },
        { status: 503 },
      );
    }

    throw error;
  }
}
