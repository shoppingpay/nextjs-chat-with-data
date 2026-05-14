import { NextResponse } from "next/server";

import {
  RequestBodyTooLargeError,
  isSameOriginRequest,
  readJson,
} from "@/lib/api-security";
import { authenticateWithPassword } from "@/lib/auth";
import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/session-store";

function getSafeRedirectPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/home";
  }

  if (value.startsWith("//")) {
    return "/home";
  }

  try {
    const parsed = new URL(value, "http://localhost");

    if (parsed.origin !== "http://localhost") {
      return "/home";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/home";
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "Cross-origin login is not allowed" },
      { status: 403 },
    );
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { message: "Expected application/json" },
      { status: 415 },
    );
  }

  let body: { callbackUrl?: unknown } | null = null;

  try {
    body = (await readJson(request)) as { callbackUrl?: unknown } | null;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { message: "Request body is too large" },
        { status: 413 },
      );
    }

    throw error;
  }

  const authenticated = await authenticateWithPassword({
    credentials: body,
    headers: request.headers,
  });

  if (!authenticated) {
    return NextResponse.json(
      { message: "Invalid username or password" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: authenticated.session.mustChangePassword
      ? "/account/change-password"
      : getSafeRedirectPath(body?.callbackUrl),
  });

  response.cookies.set(
    getSessionCookieName(),
    authenticated.token,
    getSessionCookieOptions(),
  );

  return response;
}
