export const SESSION_IDLE_TIMEOUT_KEY = "SESSION_IDLE_TIMEOUT_MINUTES";
export const SESSION_IDLE_TIMEOUT_STORAGE_KEY =
  "session-idle-timeout-minutes";
export const SESSION_IDLE_TIMEOUT_UPDATED_EVENT =
  "session-idle-timeout-updated";
export const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;
export const MIN_IDLE_TIMEOUT_MINUTES = 5;
export const MAX_IDLE_TIMEOUT_MINUTES = 480;

export function normalizeIdleTimeoutMinutes(value: unknown) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return null;
  }

  if (
    parsed < MIN_IDLE_TIMEOUT_MINUTES ||
    parsed > MAX_IDLE_TIMEOUT_MINUTES
  ) {
    return null;
  }

  return parsed;
}
