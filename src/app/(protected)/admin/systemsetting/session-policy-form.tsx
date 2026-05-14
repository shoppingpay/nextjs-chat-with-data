"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  MAX_IDLE_TIMEOUT_MINUTES,
  MIN_IDLE_TIMEOUT_MINUTES,
  SESSION_IDLE_TIMEOUT_STORAGE_KEY,
  SESSION_IDLE_TIMEOUT_UPDATED_EVENT,
} from "@/lib/session-policy";

type SessionPolicyFormProps = {
  initialIdleTimeoutMinutes: number;
};

export function SessionPolicyForm({
  initialIdleTimeoutMinutes,
}: SessionPolicyFormProps) {
  const router = useRouter();
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(
    initialIdleTimeoutMinutes,
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const response = await fetch("/api/admin/settings/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idleTimeoutMinutes }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setMessage(result?.message ?? "Unable to save session settings.");
      return;
    }

    const payload = {
      timeoutMinutes: idleTimeoutMinutes,
      updatedAt: Date.now(),
    };

    window.dispatchEvent(
      new CustomEvent(SESSION_IDLE_TIMEOUT_UPDATED_EVENT, {
        detail: payload,
      }),
    );
    window.localStorage.setItem(
      SESSION_IDLE_TIMEOUT_STORAGE_KEY,
      JSON.stringify(payload),
    );
    router.refresh();
    setMessage("Session settings saved.");
  }

  return (
    <form
      className="grid gap-4 md:grid-cols-[auto_minmax(160px,1fr)_auto] md:items-center"
      onSubmit={handleSubmit}
    >
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-[#e6edf3]">
          Session policy
        </h2>
        <p className="mt-2 text-sm text-[#8b949e]">
          Timeout for signed-in sessions (range: {MIN_IDLE_TIMEOUT_MINUTES}-
          {MAX_IDLE_TIMEOUT_MINUTES} minutes).
        </p>
      </div>

      <label className="sr-only" htmlFor="idleTimeoutMinutes">
        Timeout (minutes)
      </label>
      <input
        className="mx-auto h-11 w-24 border-0 border-b border-[#30363d] bg-transparent px-3 text-center font-mono text-sm text-[#e6edf3] outline-none transition focus:border-[#1d9e75] focus:ring-0"
        id="idleTimeoutMinutes"
        max={MAX_IDLE_TIMEOUT_MINUTES}
        min={MIN_IDLE_TIMEOUT_MINUTES}
        onChange={(event) => {
          setIdleTimeoutMinutes(Number(event.target.value));
        }}
        required
        type="number"
        value={idleTimeoutMinutes}
      />
      <button
        className="h-[30px] rounded-md bg-[#1d9e75] px-4 text-xs font-semibold text-[#0a0e14] shadow-sm transition hover:bg-[#35bd91] disabled:cursor-not-allowed disabled:bg-[#30363d] disabled:text-[#8b949e]"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>
      <p
        aria-live="polite"
        className={`min-h-5 text-sm text-[#8b949e] md:col-span-3 ${
          message ? "" : "invisible"
        }`}
      >
        {message || "No message"}
      </p>
    </form>
  );
}
