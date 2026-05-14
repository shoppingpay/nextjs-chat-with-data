import "server-only";

import {
  getBackendApiUrl as getConfiguredBackendApiUrl,
  getBackendInternalApiKey,
} from "@/lib/env";

export function getBackendApiUrl() {
  return getConfiguredBackendApiUrl()?.replace(/\/$/, "") || null;
}

function getInternalApiKey() {
  return getBackendInternalApiKey() ?? null;
}

export async function backendFetch(
  path: string,
  init?: RequestInit,
) {
  const baseUrl = getBackendApiUrl();
  const internalApiKey = getInternalApiKey();

  if (!baseUrl || !internalApiKey) {
    return null;
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "x-internal-api-key": internalApiKey,
      ...init?.headers,
    },
    cache: "no-store",
  });
}
