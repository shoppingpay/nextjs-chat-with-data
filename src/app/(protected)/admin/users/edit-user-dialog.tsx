"use client";

import { FormEvent } from "react";
import { Eye, X } from "lucide-react";

import type { AdminUser } from "@/app/(protected)/admin/users/user-table";
import { RoleSelect } from "@/app/(protected)/admin/users/role-select";
import { PASSWORD_MESSAGE } from "@/lib/validation";

export type EditUserData = {
  role: AdminUser["role"];
  email: string;
  position: string;
  department: string;
};

type EditUserDialogProps = {
  errorMessage: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: EditUserData) => void;
  user: AdminUser;
};

export function EditUserDialog({
  errorMessage,
  isSaving,
  onClose,
  onSubmit,
  user,
}: EditUserDialogProps) {
  const isSystemAdmin = user.username === "sys_admin";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onSubmit({
      role: isSystemAdmin
        ? user.role
        : (String(formData.get("role") ?? user.role) as AdminUser["role"]),
      position: String(formData.get("position") ?? ""),
      department: String(formData.get("department") ?? ""),
      email: String(formData.get("email") ?? ""),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      role="presentation"
    >
      <form
        aria-labelledby="edit-user-title"
        aria-modal="true"
        className="w-full max-w-6xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        method="post"
        noValidate
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-base font-semibold text-slate-950"
              id="edit-user-title"
            >
              Edit user
            </h2>
          </div>
          <button
            aria-label="Close edit user dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <input
            className="h-12 rounded-md border border-slate-300 bg-slate-100 px-3 text-sm text-slate-500 outline-none"
            disabled
            readOnly
            value={user.username}
          />
          <div className="space-y-1">
            <div className="relative">
              <input
                className="h-12 w-full rounded-md border border-slate-300 bg-slate-100 px-3 pr-10 text-sm text-slate-500 outline-none"
                disabled
                placeholder="Password"
                readOnly
                type="password"
                value=""
              />
              <span className="absolute right-1 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400">
                <Eye aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>
            <p className="text-xs text-slate-500">{PASSWORD_MESSAGE}</p>
          </div>
          <input
            className="h-12 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            defaultValue={user.position ?? ""}
            name="position"
            placeholder="Position"
            type="text"
          />
          <input
            className="h-12 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            defaultValue={user.department ?? ""}
            name="department"
            placeholder="Department"
            type="text"
          />
          <input
            className="h-12 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            defaultValue={user.email ?? ""}
            name="email"
            placeholder="Email"
            type="email"
          />
          <div className="grid gap-5 self-end sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]">
            <RoleSelect
              defaultValue={user.role === "ADMIN" ? "ADMIN" : "USER"}
              disabled={isSystemAdmin}
              name="role"
            />
            <div className="flex justify-end gap-2">
              <button
                className="h-12 rounded-md border border-slate-300 px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSaving}
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-12 rounded-md bg-slate-900 px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
        <p
          aria-live="polite"
          className={`mt-3 min-h-5 text-sm text-red-600 ${
            errorMessage ? "" : "invisible"
          }`}
        >
          {errorMessage || "No message"}
        </p>
      </form>
    </div>
  );
}
