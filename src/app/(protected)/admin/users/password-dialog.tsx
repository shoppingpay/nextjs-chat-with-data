"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";

import type { AdminUser } from "@/app/(protected)/admin/users/user-table";
import { PASSWORD_MESSAGE } from "@/lib/validation";

type PasswordDialogProps = {
  errorMessage: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  user: AdminUser;
};

export function PasswordDialog({
  errorMessage,
  isSaving,
  onClose,
  onSubmit,
  user,
}: PasswordDialogProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(newPassword);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      role="presentation"
    >
      <form
        aria-labelledby="password-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        method="post"
        noValidate
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-base font-semibold text-slate-950"
              id="password-dialog-title"
            >
              Change password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              User: {user.username}
            </p>
          </div>
          <button
            aria-label="Close password dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <p
          aria-live="polite"
          className={`mb-3 min-h-5 text-sm text-red-600 ${
            errorMessage ? "" : "invisible"
          }`}
        >
          {errorMessage || "No message"}
        </p>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="new-password"
          >
            New password
          </label>
          <div className="relative">
            <input
              autoComplete="new-password"
              className="h-11 w-full rounded-md border border-slate-300 px-3 pr-11 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              disabled={isSaving}
              id="new-password"
              minLength={8}
              onChange={(event) => {
                setNewPassword(event.target.value);
              }}
              required
              type={isPasswordVisible ? "text" : "password"}
              value={newPassword}
            />
            <button
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
              onClick={() => {
                setIsPasswordVisible((current) => !current);
              }}
              title={isPasswordVisible ? "Hide password" : "Show password"}
              type="button"
            >
              {isPasswordVisible ? (
                <Eye aria-hidden="true" className="h-4 w-4" />
              ) : (
                <EyeOff aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500">{PASSWORD_MESSAGE}</p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save password"}
          </button>
        </div>
      </form>
    </div>
  );
}
