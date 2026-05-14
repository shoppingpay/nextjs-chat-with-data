import "server-only";

import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";

export async function redirectIfPasswordChangeRequired() {
  const sessionUser = await getAuthenticatedUser({
    allowPasswordChangeRequired: true,
  });

  if (!sessionUser) {
    redirect("/login");
  }

  if (sessionUser.mustChangePassword) {
    redirect("/account/change-password");
  }
}
