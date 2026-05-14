import { type NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { backendFetch } from "@/lib/backend-api";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await context.params;
  const cookieHeader = request.headers.get("cookie") ?? "";

  const response = await backendFetch(
    `/api/chat/result/${encodeURIComponent(jobId)}`,
    {
      headers: {
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    },
  );

  if (!response) {
    return NextResponse.json(
      { message: "Chat service unavailable" },
      { status: 503 },
    );
  }

  const data = await response.json().catch(() => null);
  return NextResponse.json(data ?? {}, { status: response.status });
}
