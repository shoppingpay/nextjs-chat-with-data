import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { LoginAuditLog, Prisma } from "@/generated/prisma/client";

import { backendFetch } from "@/lib/backend-api";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const MAX_SEARCH_LENGTH = 100;
const AUDIT_LOG_PATH = "/admin/systemsetting/audit-log";

type AuditLogPageProps = {
  searchParams: Promise<{
    after?: string;
    before?: string;
    q?: string;
  }>;
};

type AuditLogRecord = {
  clientType: string | null;
  createdAt: Date | string;
  id: string;
  ipAddress: string | null;
  operatingSystem: string | null;
  reason: string;
  success: boolean;
  username: string;
};

type AuditLogResult = {
  hasNext: boolean;
  hasPrevious: boolean;
  logs: AuditLogRecord[];
  nextCursor: string | null;
  previousCursor: string | null;
};

type AuditLogCursor = {
  createdAt: string;
  id: string;
};

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

async function getAuditLogs(
  search: string,
  after: string | undefined,
  before: string | undefined,
): Promise<AuditLogResult> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
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
      `/api/admin/audit-log?${params.toString()}`,
    );

    if (backendResponse?.ok) {
      return (await backendResponse.json()) as AuditLogResult;
    }
  } catch {
    // Keep the audit log available while backend migration is rolled out.
  }

  const direction = before ? "previous" : "next";
  const cursor = decodeCursor(before ?? after);
  const where = combineWhere(
    getAuditLogWhere(search),
    getCursorWhere(cursor, direction),
  );
  const page = await prisma.loginAuditLog.findMany({
    where,
    orderBy:
      direction === "previous"
        ? [{ createdAt: "asc" }, { id: "asc" }]
        : [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
  });
  const hasMore = page.length > PAGE_SIZE;
  const pageLogs = page.slice(0, PAGE_SIZE);
  const logs = direction === "previous" ? pageLogs.reverse() : pageLogs;
  const firstLog = logs[0];
  const lastLog = logs.at(-1);

  return {
    hasNext: direction === "previous" ? Boolean(before) : hasMore,
    hasPrevious: direction === "previous" ? hasMore : Boolean(after),
    logs,
    nextCursor: lastLog ? encodeCursor(lastLog) : null,
    previousCursor: firstLog ? encodeCursor(firstLog) : null,
  };
}

function getPageHref(input: {
  after?: string | null;
  before?: string | null;
  search: string;
}) {
  const params = new URLSearchParams();

  if (input.search) {
    params.set("q", input.search);
  }

  if (input.before) {
    params.set("before", input.before);
  } else if (input.after) {
    params.set("after", input.after);
  }

  const query = params.toString();

  return query ? `${AUDIT_LOG_PATH}?${query}` : AUDIT_LOG_PATH;
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function formatReason(reason: string) {
  return reason
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncate(value: string | null, fallback = "-") {
  if (!value) {
    return fallback;
  }

  return value.length > 90 ? `${value.slice(0, 90)}...` : value;
}

export default async function AuditLogPage({
  searchParams,
}: AuditLogPageProps) {
  const params = await searchParams;
  const search = normalizeSearch(params.q);
  const { hasNext, hasPrevious, logs, nextCursor, previousCursor } =
    await getAuditLogs(search, params.after, params.before);
  const previousHref = getPageHref({
    before: previousCursor,
    search,
  });
  const nextHref = getPageHref({
    after: nextCursor,
    search,
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#e6edf3]">Audit log</h1>
          <p className="mt-2 text-sm text-[#8b949e]">
            Review recent authentication activity and login failures.
          </p>
        </div>
        <Link
          className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-md border border-[#30363d] bg-[#21262d] px-3 text-xs font-medium text-[#e6edf3] transition hover:bg-[#30363d]"
          href="/admin/systemsetting"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>

      <div className="flex justify-end">
        <form action={AUDIT_LOG_PATH} className="flex w-full gap-2 sm:max-w-xl">
          <input
            className="h-10 min-w-0 flex-1 rounded-md border border-[#30363d] bg-[#0f141b] px-3 text-sm text-[#e6edf3] outline-none transition focus:border-[#1d9e75] focus:ring-2 focus:ring-[#1d9e75]/20"
            defaultValue={search}
            name="q"
            placeholder="Search username, reason, IP address, or OS"
            type="search"
          />
          <button
            aria-label="Search audit logs"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#21262d] text-[#e6edf3] shadow-sm transition hover:bg-[#30363d]"
            type="submit"
          >
            <Search aria-hidden="true" className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#21262d] bg-[#161b22] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#21262d] text-left text-sm">
            <thead className="bg-[#0f141b] text-xs uppercase tracking-wide text-[#8b949e]">
              <tr>
                <th className="min-w-44 px-4 py-3">Time</th>
                <th className="min-w-32 px-4 py-3">Username</th>
                <th className="min-w-28 px-4 py-3">Result</th>
                <th className="min-w-40 px-4 py-3">Reason</th>
                <th className="min-w-36 px-4 py-3">IP address</th>
                <th className="min-w-32 px-4 py-3">OS</th>
                <th className="min-w-44 px-4 py-3">Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {logs.map((log) => (
                <tr className="align-top text-[#8b949e] transition hover:bg-[#1c2128]" key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#e6edf3]">
                    {log.username}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                        log.success
                          ? "bg-[#1d9e75]/10 text-[#1d9e75]"
                          : "bg-[#e24b4a]/10 text-[#ff7776]",
                      )}
                    >
                      {log.success ? "Success" : "Failed"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatReason(log.reason)}</td>
                  <td className="px-4 py-3">{truncate(log.ipAddress)}</td>
                  <td className="px-4 py-3">
                    {truncate(log.operatingSystem)}
                  </td>
                  <td className="px-4 py-3">{truncate(log.clientType)}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm text-[#8b949e]"
                    colSpan={7}
                  >
                    No audit logs found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm text-[#8b949e] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {logs.length} record{logs.length === 1 ? "" : "s"}.
        </p>
        <div className="flex items-center gap-2">
          <Link
            aria-disabled={!hasPrevious}
            aria-label="Previous page"
            className={cn(
              "inline-flex h-[30px] items-center gap-1.5 rounded-md border border-[#30363d] bg-[#21262d] px-3 text-xs font-medium transition",
              !hasPrevious
                ? "pointer-events-none text-[#59636e]"
                : "text-[#e6edf3] hover:bg-[#30363d]",
            )}
            href={hasPrevious ? previousHref : AUDIT_LOG_PATH}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Previous
          </Link>
          <Link
            aria-disabled={!hasNext}
            aria-label="Next page"
            className={cn(
              "inline-flex h-[30px] items-center gap-1.5 rounded-md border border-[#30363d] bg-[#21262d] px-3 text-xs font-medium transition",
              !hasNext
                ? "pointer-events-none text-[#59636e]"
                : "text-[#e6edf3] hover:bg-[#30363d]",
            )}
            href={hasNext ? nextHref : AUDIT_LOG_PATH}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
