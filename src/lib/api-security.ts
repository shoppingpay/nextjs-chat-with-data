import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const MAX_JSON_BODY_BYTES = 16 * 1024;

type AdminUser = NonNullable<Awaited<ReturnType<typeof requireAdminUser>>>;

type AdminJsonMutationResult<TData> =
  | {
      response: NextResponse;
      admin?: never;
      data?: never;
    }
  | {
      response: null;
      admin: AdminUser;
      data: TData;
    };

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body is too large");
    this.name = "RequestBodyTooLargeError";
  }
}

export function isSameOriginRequest(request: Request) {
  if (!MUTATING_METHODS.has(request.method)) {
    return true;
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  if (origin === new URL(request.url).origin) {
    return true;
  }

  const host = request.headers.get("host");

  if (!host) {
    return false;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProto?.split(",")[0]?.trim() ??
    new URL(request.url).protocol.replace(":", "");

  return origin === `${protocol}://${host}`;
}

export async function requireAdminMutationRequest(request: Request) {
  if (!isSameOriginRequest(request)) {
    return {
      response: NextResponse.json(
        { message: "Cross-origin admin requests are not allowed" },
        { status: 403 },
      ),
    };
  }

  const admin = await requireAdminUser();

  if (!admin) {
    return {
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return { admin };
}

export const requireAdminRequest = requireAdminMutationRequest;

export async function requireAdminJsonMutationRequest<
  TSchema extends z.ZodType,
>(
  request: Request,
  schema: TSchema,
  options?: {
    invalidMessage?: string;
    formatInvalidResponse?: (error: z.ZodError) => NextResponse;
  },
): Promise<AdminJsonMutationResult<z.infer<TSchema>>> {
  const { admin, response } = await requireAdminMutationRequest(request);

  if (response) {
    return { response };
  }

  const contentType = request.headers.get("content-type");

  if (!contentType?.toLowerCase().includes("application/json")) {
    return {
      response: NextResponse.json(
        { message: "Expected application/json" },
        { status: 415 },
      ),
    };
  }

  let body: unknown;

  try {
    body = await readJson(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return {
        response: NextResponse.json(
          { message: "Request body is too large" },
          { status: 413 },
        ),
      };
    }

    throw error;
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      response:
        options?.formatInvalidResponse?.(parsed.error) ??
        NextResponse.json(
          {
            message: options?.invalidMessage ?? "Invalid request body",
            issues: parsed.error.flatten(),
          },
          { status: 400 },
        ),
    };
  }

  return { admin, data: parsed.data, response: null };
}

// Request bodies are streams and can be consumed only once. Keep JSON parsing
// in the route handler or in a helper that owns body parsing for that request.
export async function readJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));

  if (
    Number.isInteger(contentLength) &&
    contentLength > MAX_JSON_BODY_BYTES
  ) {
    throw new RequestBodyTooLargeError();
  }

  try {
    const text = await readBodyText(request);

    if (!text) {
      return null;
    }

    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      throw error;
    }

    return null;
  }
}

async function readBodyText(request: Request) {
  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > MAX_JSON_BODY_BYTES) {
        throw new RequestBodyTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(Buffer.concat(chunks, totalBytes));
}
