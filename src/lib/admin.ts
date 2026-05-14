import "server-only";

import { Role } from "@/generated/prisma/client";
import { getAuthenticatedUser, getCurrentSession } from "@/lib/auth";
import { SYSTEM_ADMIN_USERNAME } from "@/lib/system-user";

export { SYSTEM_ADMIN_USERNAME };

export async function getCurrentUser() {
  return getAuthenticatedUser();
}

export async function getCurrentSessionUser() {
  return getCurrentSession();
}

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return null;
  }

  return user;
}

export async function requireAdminPageUser() {
  return requireAdminUser();
}

export function isSystemAdmin(username: string) {
  return username === SYSTEM_ADMIN_USERNAME;
}
