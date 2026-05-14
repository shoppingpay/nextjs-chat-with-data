import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/backend/prisma/prisma.service";
import type { LoginAuditLog, Prisma } from "@/generated/prisma/client";

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;

type AuditLogQueryInput = {
  after?: string;
  before?: string;
  limit?: string;
  search?: string;
};

type AuditLogCursor = {
  createdAt: string;
  id: string;
};

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

function encodeCursor(log: Pick<LoginAuditLog, "createdAt" | "id">) {
  return Buffer.from(
    JSON.stringify({
      createdAt: log.createdAt.toISOString(),
      id: log.id,
    } satisfies AuditLogCursor),
  ).toString("base64url");
}

function decodeCursor(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<AuditLogCursor>;
    const createdAt = new Date(String(parsed.createdAt));

    if (
      typeof parsed.id !== "string" ||
      Number.isNaN(createdAt.getTime())
    ) {
      return null;
    }

    return { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function getAuditLogWhere(search: string): Prisma.LoginAuditLogWhereInput {
  if (!search) {
    return {};
  }

  return {
    OR: [
      { username: { startsWith: search } },
      { reason: { startsWith: search } },
      { ipAddress: { startsWith: search } },
      { operatingSystem: { startsWith: search } },
    ],
  };
}

function getCursorWhere(
  cursor: ReturnType<typeof decodeCursor>,
  direction: "next" | "previous",
): Prisma.LoginAuditLogWhereInput {
  if (!cursor) {
    return {};
  }

  if (direction === "previous") {
    return {
      OR: [
        { createdAt: { gt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { gt: cursor.id } },
      ],
    };
  }

  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}

function combineWhere(
  searchWhere: Prisma.LoginAuditLogWhereInput,
  cursorWhere: Prisma.LoginAuditLogWhereInput,
) {
  const filters = [searchWhere, cursorWhere].filter(
    (filter) => Object.keys(filter).length > 0,
  );

  return filters.length > 0 ? { AND: filters } : {};
}

export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuditLogs(input: AuditLogQueryInput) {
    const pageSize = normalizePageSize(input.limit);
    const search = normalizeSearch(input.search);
    const direction = input.before ? "previous" : "next";
    const cursor = decodeCursor(input.before ?? input.after);
    const where = combineWhere(
      getAuditLogWhere(search),
      getCursorWhere(cursor, direction),
    );
    const page = await this.prisma.loginAuditLog.findMany({
      where,
      orderBy:
        direction === "previous"
          ? [{ createdAt: "asc" }, { id: "asc" }]
          : [{ createdAt: "desc" }, { id: "desc" }],
      take: pageSize + 1,
    });
    const hasMore = page.length > pageSize;
    const pageLogs = page.slice(0, pageSize);
    const logs = direction === "previous" ? pageLogs.reverse() : pageLogs;
    const firstLog = logs[0];
    const lastLog = logs.at(-1);

    return {
      hasNext: direction === "previous" ? Boolean(input.before) : hasMore,
      hasPrevious: direction === "previous" ? hasMore : Boolean(input.after),
      logs,
      pageSize,
      nextCursor: lastLog ? encodeCursor(lastLog) : null,
      previousCursor: firstLog ? encodeCursor(firstLog) : null,
      search,
    };
  }
}

Reflect.defineMetadata("design:paramtypes", [PrismaService], AuditLogService);
Injectable()(AuditLogService);
