import { getTrustProxyHeaders } from "@/lib/env";
import { getRequestHeader } from "@/lib/request-metadata";

const UNKNOWN_CLIENT_IP = "unknown";
type HeaderReader = Parameters<typeof getRequestHeader>[0];

function firstForwardedIp(value: string | null) {
  const first = value?.split(",")[0]?.trim();

  return first || null;
}

function forwardedHeaderIp(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/for="?([^;,"]+)/i);

  return match?.[1]?.trim() || null;
}

function normalizeClientIp(ipAddress: string) {
  return ipAddress === "::1" ? "127.0.0.1" : ipAddress;
}

export function getClientIp(headers: HeaderReader) {
  if (!headers || !getTrustProxyHeaders()) {
    return UNKNOWN_CLIENT_IP;
  }

  const ipAddress =
    firstForwardedIp(getRequestHeader(headers, "x-forwarded-for")) ??
    firstForwardedIp(getRequestHeader(headers, "x-real-ip")) ??
    firstForwardedIp(getRequestHeader(headers, "cf-connecting-ip")) ??
    forwardedHeaderIp(getRequestHeader(headers, "forwarded")) ??
    UNKNOWN_CLIENT_IP;

  return normalizeClientIp(ipAddress);
}
