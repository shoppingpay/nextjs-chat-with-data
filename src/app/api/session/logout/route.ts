import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/api-security";
import { getCurrentSession, getCurrentSessionToken } from "@/lib/auth";
import { LOGIN_AUDIT_REASONS, recordLoginAudit } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";
import { getRequestUserAgent } from "@/lib/request-metadata";
import { RedisUnavailableError } from "@/lib/redis";
import { clearSessionByToken, getExpiredSessionCookieOptions, getSessionCookieName } from "@/lib/session-store";

export async function POST(request: Request) {
  const ipAddress = getClientIp(request.headers);
  const userAgent = getRequestUserAgent(request.headers);

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "Cross-origin session logout is not allowed" },
      { status: 403 },
    );
  }

  const session = await getCurrentSession();
  const sessionToken = await getCurrentSessionToken();

  if (!sessionToken) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      getSessionCookieName(),
      "",
      getExpiredSessionCookieOptions(),
    );
    return response;
  }

  try {
    await clearSessionByToken(sessionToken);

    if (session) {
      await recordLoginAudit({
        username: session.username,
        userId: session.userId,
        success: true,
        reason: LOGIN_AUDIT_REASONS.LOGOUT_SUCCESS,
        ipAddress,
        userAgent,
      });
    }
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      return NextResponse.json(
        { message: "Session logout is temporarily unavailable" },
        { status: 503 },
      );
    }

    throw error;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    getSessionCookieName(),
    "",
    getExpiredSessionCookieOptions(),
  );

  return response;
}
