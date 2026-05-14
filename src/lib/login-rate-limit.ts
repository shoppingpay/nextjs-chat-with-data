import "server-only";

import { ensureRedisReady, redis } from "@/lib/redis";

const LOGIN_ATTEMPT_PREFIX = "login:attempts";
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const MAX_FAILED_LOGIN_ATTEMPTS_BY_IP = 20;
const LOCK_DURATIONS_SECONDS = [5 * 60, 15 * 60, 60 * 60] as const;
const RATE_LIMIT_STATE_TTL_SECONDS = 24 * 60 * 60;
const UNKNOWN_CLIENT_IP = "unknown";

type LoginRateLimitScope = "username" | "ip" | "identity";

type LoginRateLimitState = {
  failedAttempts: number;
  lockLevel: number;
  lockedUntil: number;
};

type LoginRateLimitStatus = {
  failedAttempts: number;
  isLocked: boolean;
  lockMinutes: number;
  remainingAttempts: number;
  retryAfterSeconds: number;
  scope?: LoginRateLimitScope;
};

function normalizeKeyPart(value: string) {
  return value.trim().toLowerCase();
}

function getLoginAttemptKey(scope: LoginRateLimitScope, key: string) {
  return `${LOGIN_ATTEMPT_PREFIX}:${scope}:${normalizeKeyPart(key)}`;
}

function getScopeFromKey(key: string): LoginRateLimitScope {
  const scope = key.split(":")[2];

  if (scope === "ip" || scope === "identity" || scope === "username") {
    return scope;
  }

  return "username";
}

function getIdentityKey(username: string, ipAddress: string) {
  return `${normalizeKeyPart(username)}:${normalizeKeyPart(ipAddress)}`;
}

function getRateLimitKeys(username: string, ipAddress: string) {
  const keys = [getLoginAttemptKey("username", username)];

  if (normalizeKeyPart(ipAddress) !== UNKNOWN_CLIENT_IP) {
    keys.push(
      getLoginAttemptKey("ip", ipAddress),
      getLoginAttemptKey("identity", getIdentityKey(username, ipAddress)),
    );
  }

  return keys;
}

function getLockDurationSeconds(lockLevel: number) {
  return (
    LOCK_DURATIONS_SECONDS[
      Math.min(lockLevel, LOCK_DURATIONS_SECONDS.length - 1)
    ] ?? LOCK_DURATIONS_SECONDS[LOCK_DURATIONS_SECONDS.length - 1]
  );
}

function getNextLockMinutes(lockLevel: number) {
  return Math.ceil(getLockDurationSeconds(lockLevel) / 60);
}

function getMaxFailedLoginAttempts(scope: LoginRateLimitScope) {
  return scope === "ip"
    ? MAX_FAILED_LOGIN_ATTEMPTS_BY_IP
    : MAX_FAILED_LOGIN_ATTEMPTS;
}

function parseState(raw: string | null): LoginRateLimitState {
  if (!raw) {
    return {
      failedAttempts: 0,
      lockLevel: 0,
      lockedUntil: 0,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LoginRateLimitState>;

    return {
      failedAttempts: Math.max(0, Number(parsed.failedAttempts) || 0),
      lockLevel: Math.max(0, Number(parsed.lockLevel) || 0),
      lockedUntil: Math.max(0, Number(parsed.lockedUntil) || 0),
    };
  } catch {
    return {
      failedAttempts: 0,
      lockLevel: 0,
      lockedUntil: 0,
    };
  }
}

async function readState(key: string) {
  return parseState(await redis.get(key));
}

async function writeState(key: string, state: LoginRateLimitState) {
  await redis.set(
    key,
    JSON.stringify(state),
    "EX",
    RATE_LIMIT_STATE_TTL_SECONDS,
  );
}

function getStatusFromState(
  scope: LoginRateLimitScope,
  state: LoginRateLimitState,
): LoginRateLimitStatus {
  const now = Date.now();
  const maxFailedAttempts = getMaxFailedLoginAttempts(scope);
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((state.lockedUntil - now) / 1000),
  );
  const isLocked = retryAfterSeconds > 0;
  const failedAttempts = isLocked
    ? maxFailedAttempts
    : Math.min(state.failedAttempts, maxFailedAttempts);

  return {
    failedAttempts,
    isLocked,
    lockMinutes: getNextLockMinutes(state.lockLevel),
    remainingAttempts: isLocked
      ? 0
      : Math.max(0, maxFailedAttempts - failedAttempts),
    retryAfterSeconds,
  };
}

async function getScopedStatus(scope: LoginRateLimitScope, key: string) {
  return {
    ...getStatusFromState(scope, await readState(getLoginAttemptKey(scope, key))),
    scope,
  };
}

export async function isLoginRateLimited(username: string, ipAddress: string) {
  await ensureRedisReady();

  const statuses = await Promise.all(
    getRateLimitKeys(username, ipAddress).map(async (key) =>
      getStatusFromState(getScopeFromKey(key), await readState(key)),
    ),
  );

  return statuses.some((status) => status.isLocked);
}

export async function getLoginAttemptStatus(username: string, ipAddress: string) {
  await ensureRedisReady();

  const identityStatus =
    normalizeKeyPart(ipAddress) === UNKNOWN_CLIENT_IP
      ? null
      : await getScopedStatus("identity", getIdentityKey(username, ipAddress));

  const usernameStatus = await getScopedStatus("username", username);
  const ipStatus =
    normalizeKeyPart(ipAddress) === UNKNOWN_CLIENT_IP
      ? null
      : await getScopedStatus("ip", ipAddress);

  if (ipStatus?.isLocked) {
    return {
      ...ipStatus,
      failedAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
      remainingAttempts: 0,
    };
  }

  return identityStatus ?? usernameStatus;
}

export async function recordFailedLoginAttempt(
  username: string,
  ipAddress: string,
) {
  await ensureRedisReady();

  const now = Date.now();

  await Promise.all(
    getRateLimitKeys(username, ipAddress).map(async (key) => {
      const state = await readState(key);

      if (state.lockedUntil > now) {
        return;
      }

      const scope = getScopeFromKey(key);
      const failedAttempts = state.failedAttempts + 1;
      const maxFailedAttempts = getMaxFailedLoginAttempts(scope);

      if (failedAttempts < maxFailedAttempts) {
        await writeState(key, {
          ...state,
          failedAttempts,
          lockedUntil: 0,
        });
        return;
      }

      const lockDurationSeconds = getLockDurationSeconds(state.lockLevel);

      await writeState(key, {
        failedAttempts: 0,
        lockLevel: state.lockLevel + 1,
        lockedUntil: now + lockDurationSeconds * 1000,
      });
    }),
  );
}

export async function clearFailedLoginAttempts(
  username: string,
  ipAddress: string,
) {
  await ensureRedisReady();

  await redis.del(
    getLoginAttemptKey("username", username),
    getLoginAttemptKey("identity", getIdentityKey(username, ipAddress)),
  );
}
