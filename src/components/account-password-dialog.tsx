"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";

import { PASSWORD_MESSAGE } from "@/lib/validation";

type AccountPasswordDialogProps = {
  errorMessage: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: { currentPassword: string; newPassword: string }) => void;
  username: string;
};

export function AccountPasswordDialog({
  errorMessage,
  isSaving,
  onClose,
  onSubmit,
  username,
}: AccountPasswordDialogProps) {
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] =
    useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onSubmit({
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
      role="presentation"
    >
      <form
        aria-labelledby="account-password-title"
        aria-modal="true"
        className="w-full max-w-md rounded-[10px] border border-[#30363d] bg-[#161b22] p-5 shadow-none"
        method="post"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-base font-semibold leading-6 text-[#e6edf3]"
              id="account-password-title"
            >
              Change password
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#8b949e]">
              User: {username}
            </p>
          </div>
          <button
            aria-label="Close change password dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#8b949e] transition hover:bg-[#21262d] hover:text-[#e6edf3] disabled:cursor-not-allowed disabled:opacity-50"
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
          className={`mb-3 min-h-5 text-sm leading-6 text-[#ff7776] ${
            errorMessage ? "" : "invisible"
          }`}
        >
          {errorMessage || "No message"}
        </p>

        <div className="space-y-4">
          <PasswordField
            autoComplete="current-password"
            id="currentPassword"
            isSaving={isSaving}
            isVisible={isCurrentPasswordVisible}
            label="Current password"
            name="currentPassword"
            onToggleVisible={() =>
              setIsCurrentPasswordVisible((current) => !current)
            }
          />
          <div>
            <PasswordField
              autoComplete="new-password"
              id="newPassword"
              isSaving={isSaving}
              isVisible={isNewPasswordVisible}
              label="New password"
              minLength={8}
              name="newPassword"
              onToggleVisible={() =>
                setIsNewPasswordVisible((current) => !current)
              }
            />
            <p className="mt-2 text-xs leading-5 text-[#8b949e]">
              {PASSWORD_MESSAGE}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="h-10 rounded-md border border-[#30363d] px-4 text-sm font-medium text-[#8b949e] transition hover:bg-[#21262d] hover:text-[#e6edf3] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-10 rounded-md bg-[#1d9e75] px-5 text-sm font-semibold text-[#0a0e14] transition hover:bg-[#35bd91] disabled:cursor-not-allowed disabled:bg-[#30363d] disabled:text-[#8b949e]"
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

function PasswordField({
  autoComplete,
  id,
  isSaving,
  isVisible,
  label,
  minLength,
  name,
  onToggleVisible,
}: {
  autoComplete: string;
  id: string;
  isSaving: boolean;
  isVisible: boolean;
  label: string;
  minLength?: number;
  name: string;
  onToggleVisible: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-6 text-[#e6edf3]" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className="h-11 w-full rounded-md border border-[#30363d] bg-[#0f141b] px-3 pr-11 text-sm text-[#e6edf3] outline-none transition focus:border-[#1d9e75] focus:ring-2 focus:ring-[#1d9e75]/20"
          disabled={isSaving}
          id={id}
          minLength={minLength}
          name={name}
          required
          type={isVisible ? "text" : "password"}
        />
        <button
          aria-label={isVisible ? "Hide password" : "Show password"}
          className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-[#8b949e] transition hover:bg-[#21262d] hover:text-[#e6edf3] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
          onClick={onToggleVisible}
          title={isVisible ? "Hide password" : "Show password"}
          type="button"
        >
          {isVisible ? (
            <Eye aria-hidden="true" className="h-4 w-4" />
          ) : (
            <EyeOff aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
