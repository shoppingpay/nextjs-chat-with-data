"use client";

import { X } from "lucide-react";

import type { AdminUser } from "@/app/(protected)/admin/users/user-table";

type DeleteUserDialogProps = {
  errorMessage: string;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: AdminUser;
};

export function DeleteUserDialog({
  errorMessage,
  isSaving,
  onClose,
  onConfirm,
  user,
}: DeleteUserDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      role="presentation"
    >
      <div
        aria-labelledby="delete-user-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-base font-semibold text-slate-950"
              id="delete-user-title"
            >
              Delete user
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete user{" "}
              <span className="font-semibold text-slate-950">
                {user.username}
              </span>
              .
            </p>
          </div>
          <button
            aria-label="Close delete dialog"
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
            className="h-10 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            disabled={isSaving}
            onClick={onConfirm}
            type="button"
          >
            {isSaving ? "Deleting..." : "Delete user"}
          </button>
        </div>
      </div>
    </div>
  );
}
