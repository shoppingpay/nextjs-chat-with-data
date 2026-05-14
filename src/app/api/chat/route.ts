import { type NextRequest, NextResponse } from "next/server";

import {
  RequestBodyTooLargeError,
  isSameOriginRequest,
  readJson,
} from "@/lib/api-security";
import { getAuthenticatedUser } from "@/lib/auth";
import { backendFetch } from "@/lib/backend-api";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
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

  const cookieHeader = request.headers.get("cookie") ?? "";
  const response = await backendFetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { Cookie: cookieHeader }),
    },
    body: JSON.stringify(body),
  });

  if (!response) {
    return NextResponse.json(
      { message: "Chat service unavailable" },
      { status: 503 },
    );
  }

  const data = await response.json().catch(() => null);
  return NextResponse.json(data ?? {}, { status: response.status });
}
