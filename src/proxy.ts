import { NextResponse, type NextRequest } from "next/server";

import {
  getSessionByToken,
  getSessionCookieName,
} from "@/lib/session-store";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-path", pathname);

  const session = await getSessionByToken(
    request.cookies.get(getSessionCookieName())?.value,
  );
  const isTimeoutLogin =
    request.nextUrl.searchParams.get("reason") === "timeout";

  if (pathname === "/login" && session && !isTimeoutLogin) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  const isProtectedRoute =
    pathname === "/home" ||
    pathname.startsWith("/train-model") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/machine") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin");

  if (!isProtectedRoute) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    pathname.startsWith("/admin") &&
    session.role !== "ADMIN" &&
    session.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (
    session.mustChangePassword &&
    pathname !== "/account/change-password"
  ) {
    return NextResponse.redirect(
      new URL("/account/change-password", request.url),
    );
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/login",
    "/home/:path*",
    "/train-model/:path*",
    "/analytics/:path*",
    "/machine/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
};
