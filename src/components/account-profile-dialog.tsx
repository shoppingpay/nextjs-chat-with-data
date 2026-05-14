"use client";

import { FormEvent } from "react";
import { X } from "lucide-react";

export type AccountProfile = {
  department: string | null;
  email: string | null;
  position: string | null;
  username: string;
};

type AccountProfileDialogProps = {
  errorMessage: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: {
    department: string;
    email: string;
    position: string;
  }) => void;
  profile: AccountProfile;
};

export function AccountProfileDialog({
  errorMessage,
  isSaving,
  onClose,
  onSubmit,
  profile,
}: AccountProfileDialogProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onSubmit({
      department: String(formData.get("department") ?? ""),
      email: String(formData.get("email") ?? ""),
      position: String(formData.get("position") ?? ""),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
      role="presentation"
    >
      <form
        aria-labelledby="account-profile-title"
        aria-modal="true"
        className="w-full max-w-3xl rounded-[10px] border border-[#30363d] bg-[#161b22] p-5 shadow-none"
        method="post"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-base font-semibold leading-6 text-[#e6edf3]"
              id="account-profile-title"
            >
              Profile
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#8b949e]">
              Update your own profile details.
            </p>
          </div>
          <button
            aria-label="Close profile dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#8b949e] transition hover:bg-[#21262d] hover:text-[#e6edf3] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <input
            className="h-12 rounded-md border border-[#30363d] bg-[#0f141b] px-3 text-sm text-[#8b949e] outline-none"
            disabled
            readOnly
            value={profile.username}
          />
          <input
            className="h-12 rounded-md border border-[#30363d] bg-[#0f141b] px-3 text-sm text-[#e6edf3] outline-none transition focus:border-[#1d9e75] focus:ring-2 focus:ring-[#1d9e75]/20"
            autoComplete="email"
            defaultValue={profile.email ?? ""}
            maxLength={254}
            name="email"
            placeholder="Email"
            type="email"
          />
          <input
            className="h-12 rounded-md border border-[#30363d] bg-[#0f141b] px-3 text-sm text-[#e6edf3] outline-none transition focus:border-[#1d9e75] focus:ring-2 focus:ring-[#1d9e75]/20"
            defaultValue={profile.position ?? ""}
            maxLength={100}
            name="position"
            placeholder="Position"
            type="text"
          />
          <input
            className="h-12 rounded-md border border-[#30363d] bg-[#0f141b] px-3 text-sm text-[#e6edf3] outline-none transition focus:border-[#1d9e75] focus:ring-2 focus:ring-[#1d9e75]/20"
            defaultValue={profile.department ?? ""}
            maxLength={100}
            name="department"
            placeholder="Department"
            type="text"
          />
        </div>

        <p
          aria-live="polite"
          className={`mt-3 min-h-5 text-sm leading-6 text-[#ff7776] ${
            errorMessage ? "" : "invisible"
          }`}
        >
          {errorMessage || "No message"}
        </p>

        <div className="mt-4 flex justify-end gap-2">
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
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
