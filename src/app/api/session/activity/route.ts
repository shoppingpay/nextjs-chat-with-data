import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/api-security";
import { getCurrentSessionToken } from "@/lib/auth";
import { RedisUnavailableError } from "@/lib/redis";
import { touchServerSession } from "@/lib/session-store";
import { getIdleTimeoutMinutes } from "@/lib/settings";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "Cross-origin session activity is not allowed" },
      { status: 403 },
    );
  }

  const sessionToken = await getCurrentSessionToken();

  if (!sessionToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const idleTimeoutMinutes = await getIdleTimeoutMinutes();
    const session = await touchServerSession(sessionToken, idleTimeoutMinutes);

    if (!session) {
      return NextResponse.json(
        { message: "Session timed out" },
        { status: 401 },
      );
    }
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      return NextResponse.json(
        { message: "Session validation is temporarily unavailable" },
        { status: 503 },
      );
    }

    throw error;
  }

  return NextResponse.json({ ok: true });
}
