import "dotenv/config";

import { readFileSync } from "node:fs";

const DEFAULT_DEV_INTERNAL_API_KEY = "local-dev-internal-api-key";
const DEFAULT_DEV_SYS_ADMIN_PASSWORD = "Admin1234";

type EnvName =
  | "BACKEND_API_URL"
  | "BACKEND_INTERNAL_API_KEY"
  | "BACKEND_PORT"
  | "DATABASE_URL"
  | "NEXTAUTH_URL"
  | "REDIS_URL"
  | "SEED_SYS_ADMIN_PASSWORD"
  | "TRUST_PROXY_HEADERS";

function trimSecretFileValue(value: string) {
  return value.replace(/[\r\n]+$/, "");
}

function optionalTrimmedValue(value: string | undefined) {
  return value?.trim() || undefined;
}

function readEnvValue(name: EnvName) {
  const directValue = optionalTrimmedValue(process.env[name]);
  const filePath = optionalTrimmedValue(process.env[`${name}_FILE`]);

  if (directValue && filePath) {
    throw new Error(`${name} and ${name}_FILE cannot both be set.`);
  }

  if (directValue) {
    return directValue;
  }

  if (!filePath) {
    return undefined;
  }

  try {
    return optionalTrimmedValue(
      trimSecretFileValue(
        readFileSync(/* turbopackIgnore: true */ filePath, "utf8"),
      ),
    );
  } catch (error) {
    throw new Error(`Unable to read ${name}_FILE at ${filePath}.`, {
      cause: error,
    });
  }
}

function requiredEnv(name: EnvName) {
  const value = readEnvValue(name);

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function optionalDevFallback(name: EnvName, fallback: string) {
  return (
    readEnvValue(name) ??
    (process.env.NODE_ENV === "production" ? undefined : fallback)
  );
}

function parseBooleanEnv(name: EnvName, defaultValue: boolean) {
  const value = readEnvValue(name);

  if (!value) {
    return defaultValue;
  }

  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value.toLowerCase())) {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}

export function getDatabaseUrl() {
  return requiredEnv("DATABASE_URL");
}

export function getOptionalDatabaseUrl() {
  return readEnvValue("DATABASE_URL");
}

export function getRedisUrl() {
  return requiredEnv("REDIS_URL");
}

export function getFrontendOrigin() {
  return readEnvValue("NEXTAUTH_URL");
}

export function getBackendApiUrl() {
  return readEnvValue("BACKEND_API_URL");
}

export function getBackendInternalApiKey() {
  return optionalDevFallback(
    "BACKEND_INTERNAL_API_KEY",
    DEFAULT_DEV_INTERNAL_API_KEY,
  );
}

export function getBackendPort() {
  const value = readEnvValue("BACKEND_PORT");

  if (!value) {
    return 4000;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("BACKEND_PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export function getSeedSysAdminPassword() {
  return optionalDevFallback(
    "SEED_SYS_ADMIN_PASSWORD",
    DEFAULT_DEV_SYS_ADMIN_PASSWORD,
  ) ?? requiredEnv("SEED_SYS_ADMIN_PASSWORD");
}

export function getTrustProxyHeaders() {
  return parseBooleanEnv(
    "TRUST_PROXY_HEADERS",
    process.env.NODE_ENV !== "production",
  );
}
