import Redis from "ioredis";

import { getRedisUrl } from "@/lib/env";

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_MAIN_MODEL = "gemma-main-placeholder";
const DEFAULT_GUARDRAIL_MODEL = "qwen-guardrail-placeholder";

function readTrimmed(name: string) {
  return process.env[name]?.trim() || undefined;
}

export function getOllamaBaseUrl() {
  return readTrimmed("OLLAMA_BASE_URL") ?? DEFAULT_OLLAMA_BASE_URL;
}

export function getOllamaMainModel() {
  return readTrimmed("OLLAMA_MAIN_MODEL") ?? DEFAULT_MAIN_MODEL;
}

export function getOllamaGuardrailModel() {
  return readTrimmed("OLLAMA_GUARDRAIL_MODEL") ?? DEFAULT_GUARDRAIL_MODEL;
}

export function getMcpServerCommand() {
  return readTrimmed("MCP_SERVER_COMMAND") ?? "node";
}

export function getMcpServerArgs(): string[] {
  const raw = readTrimmed("MCP_SERVER_ARGS");
  if (!raw) {
    return ["packages/mcp-server/dist/index.js"];
  }
  return raw.split(/\s+/).filter(Boolean);
}

export function getOllamaRequestTimeoutMs() {
  const raw = readTrimmed("OLLAMA_REQUEST_TIMEOUT_MS");

  if (!raw) {
    return 30_000;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1_000) {
    throw new Error(
      "OLLAMA_REQUEST_TIMEOUT_MS must be an integer >= 1000 (milliseconds).",
    );
  }

  return parsed;
}

// BullMQ needs maxRetriesPerRequest: null — do NOT share with the app-wide redis singleton.
// Queue and Worker each call this to get an independent connection.
export function createBullmqConnection() {
  return new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    family: 4,
    lazyConnect: true,
  });
}
