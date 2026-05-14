import type { Prisma } from "@/generated/prisma/client";

import {
  UserTable,
  type AdminUser,
} from "@/app/(protected)/admin/users/user-table";
import { backendFetch } from "@/lib/backend-api";
import { prisma } from "@/lib/prisma";
import { SYSTEM_ADMIN_USERNAME } from "@/lib/system-user";

const USERS_PER_PAGE = 10;
const MAX_SEARCH_LENGTH = 100;

type AdminUsersPageProps = {
  searchParams: Promise<{
    after?: string;
    before?: string;
    q?: string;
  }>;
};

type UserRecord = Omit<AdminUser, "createdAt" | "lastLoginAt"> & {
  createdAt: Date | string;
  lastLoginAt: Date | string | null;
};

type UsersResult = {
  hasNext: boolean;
  hasPrevious: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
  users: UserRecord[];
};

function normalizeSearch(value: string | undefined) {
  return value?.trim().slice(0, MAX_SEARCH_LENGTH) ?? "";
}

type UserCursor = {
  createdAt: string;
  id: string;
};

function encodeCursor(user: Pick<UserRecord, "createdAt" | "id">) {
  const createdAt =
    typeof user.createdAt === "string"
      ? new Date(user.createdAt).toISOString()
      : user.createdAt.toISOString();

  return Buffer.from(
    JSON.stringify({
      createdAt,
      id: user.id,
    } satisfies UserCursor),
  ).toString("base64url");
}

function decodeCursor(value: string | undefined): UserCursor | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<UserCursor>;

    if (
      typeof parsed.createdAt !== "string" ||
      Number.isNaN(Date.parse(parsed.createdAt)) ||
      typeof parsed.id !== "string" ||
      !parsed.id
    ) {
      return null;
    }

    return {
      createdAt: parsed.createdAt,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

function getUserWhere(search: string): Prisma.UserWhereInput {
  const visibleUsersOnly: Prisma.UserWhereInput = {
    username: { not: SYSTEM_ADMIN_USERNAME },
  };

  if (!search) {
    return visibleUsersOnly;
  }

  const normalizedSearch = search.toLowerCase();
  const roleFilters = ["USER", "ADMIN", "SUPER_ADMIN"].filter((role) =>
    role.toLowerCase().includes(normalizedSearch),
  ) as Array<"USER" | "ADMIN" | "SUPER_ADMIN">;
  const activeFilter =
    normalizedSearch === "active"
      ? true
      : normalizedSearch === "inactive"
        ? false
        : null;

  return {
    AND: [
      visibleUsersOnly,
      {
        OR: [
          { username: { contains: search } },
          ...(roleFilters.length > 0
            ? [{ role: { in: roleFilters } }]
            : []),
          ...(activeFilter === null
            ? []
            : [{ isActive: { equals: activeFilter } }]),
        ],
      },
    ],
  };
}

function getRoleSortPriority(role: UserRecord["role"]) {
  return role === "ADMIN" || role === "SUPER_ADMIN" ? 0 : 1;
}

function getUserCreatedAtTime(user: UserRecord) {
  return typeof user.createdAt === "string"
    ? new Date(user.createdAt).getTime()
    : user.createdAt.getTime();
}

function getUserCreatedAtIso(user: Pick<UserRecord, "createdAt">) {
  return typeof user.createdAt === "string"
    ? new Date(user.createdAt).toISOString()
    : user.createdAt.toISOString();
}

function sortUsersForTable(users: UserRecord[]) {
  return users.sort((left, right) => {
    const roleDifference =
      getRoleSortPriority(left.role) - getRoleSortPriority(right.role);

    if (roleDifference !== 0) {
      return roleDifference;
    }

    const createdAtDifference =
      getUserCreatedAtTime(left) - getUserCreatedAtTime(right);

    if (createdAtDifference !== 0) {
      return createdAtDifference;
    }

    return left.id.localeCompare(right.id);
  });
}

function getCursorIndex(users: UserRecord[], cursor: UserCursor | null) {
  if (!cursor) {
    return -1;
  }

  return users.findIndex(
    (user) =>
      user.id === cursor.id &&
      getUserCreatedAtIso(user) === new Date(cursor.createdAt).toISOString(),
  );
}

async function getUsers(
  search: string,
  after: string | undefined,
  before: string | undefined,
): Promise<UsersResult> {
  const params = new URLSearchParams({
    limit: String(USERS_PER_PAGE),
  });

  if (search) {
    params.set("q", search);
  }

  if (before) {
    params.set("before", before);
  } else if (after) {
    params.set("after", after);
  }

  try {
    const backendResponse = await backendFetch(
      `/api/admin/users?${params.toString()}`,
    );

    if (backendResponse?.ok) {
      return (await backendResponse.json()) as UsersResult;
    }
  } catch {
    // Keep the users page available while backend migration is rolled out.
  }

  const decodedAfter = decodeCursor(after);
  const decodedBefore = decodeCursor(before);
  const direction = decodedBefore ? "previous" : "next";
  const cursor = decodedBefore ?? decodedAfter;
  const where = getUserWhere(search);
  const sortedUsers = sortUsersForTable(await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      role: true,
      email: true,
      position: true,
      department: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  }));
  const cursorIndex = getCursorIndex(sortedUsers, cursor);
  const startIndex =
    direction === "previous"
      ? Math.max(0, (cursorIndex === -1 ? sortedUsers.length : cursorIndex) - USERS_PER_PAGE)
      : Math.max(0, cursorIndex + 1);
  const endIndex =
    direction === "previous"
      ? cursorIndex === -1
        ? sortedUsers.length
        : cursorIndex
      : startIndex + USERS_PER_PAGE;
  const users = sortedUsers.slice(startIndex, endIndex);
  const firstUser = users[0];
  const lastUser = users.at(-1);

  return {
    hasNext: endIndex < sortedUsers.length,
    hasPrevious: startIndex > 0,
    nextCursor: lastUser ? encodeCursor(lastUser) : null,
    previousCursor: firstUser ? encodeCursor(firstUser) : null,
    users,
  };
}

function serializeDate(value: Date | string) {
  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString();
}

function serializeNullableDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return serializeDate(value);
}

function getCursorHref(
  direction: "after" | "before",
  cursor: string | null,
  search: string,
) {
  const params = new URLSearchParams();

  if (search) {
    params.set("q", search);
  }

  if (cursor) {
    params.set(direction, cursor);
  }

  const query = params.toString();

  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const params = await searchParams;
  const search = normalizeSearch(params.q);
  const { hasNext, hasPrevious, nextCursor, previousCursor, users } =
    await getUsers(search, params.after, params.before);
  const nextHref = getCursorHref("after", nextCursor, search);
  const previousHref = getCursorHref("before", previousCursor, search);

  const serializedUsers: AdminUser[] = users.map((user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    position: user.position,
    department: user.department,
    isActive: user.isActive,
    createdAt: serializeDate(user.createdAt),
    lastLoginAt: serializeNullableDate(user.lastLoginAt),
  }));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#e6edf3]">Manage users</h1>
        <p className="mt-2 text-sm text-[#8b949e]">
          Add, update, and remove user access.
        </p>
      </div>

      <UserTable
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        nextHref={nextHref}
        previousHref={previousHref}
        search={search}
        users={serializedUsers}
      />
    </section>
  );
}
