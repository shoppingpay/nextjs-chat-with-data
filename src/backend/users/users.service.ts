import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/backend/prisma/prisma.service";
import { SYSTEM_ADMIN_USERNAME } from "@/lib/system-user";
import type { Prisma, User } from "@/generated/prisma/client";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;

type UsersQueryInput = {
  after?: string;
  before?: string;
  limit?: string;
  search?: string;
};

type UserCursor = {
  createdAt: string;
  id: string;
};

type UserListItem = Pick<
  User,
  | "createdAt"
  | "department"
  | "email"
  | "id"
  | "isActive"
  | "lastLoginAt"
  | "position"
  | "role"
  | "updatedAt"
  | "username"
>;

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function normalizePageSize(value: string | undefined) {
  return Math.min(
    normalizePositiveInteger(value, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
}

function normalizeSearch(value: string | undefined) {
  return value?.trim().slice(0, MAX_SEARCH_LENGTH) ?? "";
}

function encodeCursor(user: Pick<User, "createdAt" | "id">) {
  return Buffer.from(
    JSON.stringify({
      createdAt: user.createdAt.toISOString(),
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
          ...(roleFilters.length > 0 ? [{ role: { in: roleFilters } }] : []),
          ...(activeFilter === null
            ? []
            : [{ isActive: { equals: activeFilter } }]),
        ],
      },
    ],
  };
}

function getRoleSortPriority(role: User["role"]) {
  return role === "ADMIN" || role === "SUPER_ADMIN" ? 0 : 1;
}

function sortUsersForTable(users: UserListItem[]) {
  return users.sort((left, right) => {
    const roleDifference =
      getRoleSortPriority(left.role) - getRoleSortPriority(right.role);

    if (roleDifference !== 0) {
      return roleDifference;
    }

    const createdAtDifference =
      left.createdAt.getTime() - right.createdAt.getTime();

    if (createdAtDifference !== 0) {
      return createdAtDifference;
    }

    return left.id.localeCompare(right.id);
  });
}

function getCursorIndex(users: UserListItem[], cursor: UserCursor | null) {
  if (!cursor) {
    return -1;
  }

  return users.findIndex(
    (user) =>
      user.id === cursor.id &&
      user.createdAt.toISOString() === new Date(cursor.createdAt).toISOString(),
  );
}

export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(input: UsersQueryInput) {
    const pageSize = normalizePageSize(input.limit);
    const search = normalizeSearch(input.search);
    const after = decodeCursor(input.after);
    const before = decodeCursor(input.before);
    const direction = before ? "previous" : "next";
    const cursor = before ?? after;
    const sortedUsers = sortUsersForTable(await this.prisma.user.findMany({
      where: getUserWhere(search),
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
        ? Math.max(0, (cursorIndex === -1 ? sortedUsers.length : cursorIndex) - pageSize)
        : Math.max(0, cursorIndex + 1);
    const endIndex =
      direction === "previous"
        ? cursorIndex === -1
          ? sortedUsers.length
          : cursorIndex
        : startIndex + pageSize;
    const users = sortedUsers.slice(startIndex, endIndex);
    const firstUser = users[0];
    const lastUser = users.at(-1);

    return {
      hasNext:
        direction === "previous" ? endIndex < sortedUsers.length : endIndex < sortedUsers.length,
      hasPrevious: startIndex > 0,
      nextCursor: lastUser ? encodeCursor(lastUser) : null,
      pageSize,
      previousCursor: firstUser ? encodeCursor(firstUser) : null,
      search,
      users,
    };
  }
}

Reflect.defineMetadata("design:paramtypes", [PrismaService], UsersService);
Injectable()(UsersService);
