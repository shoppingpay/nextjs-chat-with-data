"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { PASSWORD_MESSAGE } from "@/lib/validation";

export function ChangePasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCurrentVisible, setIsCurrentVisible] = useState(false);
  const [isNewVisible, setIsNewVisible] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword: String(formData.get("newPassword") ?? ""),
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setMessage(result?.message ?? "Unable to update password.");
      return;
    }

    router.replace("/home");
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-5" method="post" onSubmit={handleSubmit}>
      {message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="currentPassword">
          Current password
        </label>
        <div className="relative">
          <input
            autoComplete="current-password"
            className="h-11 w-full rounded-md border border-slate-300 px-3 pr-11 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            disabled={isSaving}
            id="currentPassword"
            name="currentPassword"
            required
            type={isCurrentVisible ? "text" : "password"}
          />
          <button
            aria-label={isCurrentVisible ? "Hide current password" : "Show current password"}
            className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={() => setIsCurrentVisible((current) => !current)}
            title={isCurrentVisible ? "Hide password" : "Show password"}
            type="button"
          >
            {isCurrentVisible ? (
              <Eye aria-hidden="true" className="h-4 w-4" />
            ) : (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="newPassword">
          New password
        </label>
        <div className="relative">
          <input
            autoComplete="new-password"
            className="h-11 w-full rounded-md border border-slate-300 px-3 pr-11 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            disabled={isSaving}
            id="newPassword"
            minLength={8}
            name="newPassword"
            required
            type={isNewVisible ? "text" : "password"}
          />
          <button
            aria-label={isNewVisible ? "Hide new password" : "Show new password"}
            className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={() => setIsNewVisible((current) => !current)}
            title={isNewVisible ? "Hide password" : "Show password"}
            type="button"
          >
            {isNewVisible ? (
              <Eye aria-hidden="true" className="h-4 w-4" />
            ) : (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500">{PASSWORD_MESSAGE}</p>
      </div>

      <button
        className="h-11 w-full rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}
