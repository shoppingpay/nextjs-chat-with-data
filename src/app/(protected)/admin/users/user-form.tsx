"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";

import { RoleSelect } from "@/app/(protected)/admin/users/role-select";
import { PASSWORD_MESSAGE } from "@/lib/validation";

type UserFormProps = {
  onClose: () => void;
  onCreated: () => void;
};

export function UserForm({ onClose, onCreated }: UserFormProps) {
  const [message, setMessage] = useState("");
  const [isErrorMessage, setIsErrorMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsErrorMessage(false);
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(formData.get("username") ?? ""),
        password: String(formData.get("password") ?? ""),
        role: String(formData.get("role") ?? "USER"),
        position: String(formData.get("position") ?? ""),
        department: String(formData.get("department") ?? ""),
        email: String(formData.get("email") ?? ""),
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setMessage(result?.message ?? "Unable to create user.");
      setIsErrorMessage(true);
      return;
    }

    form.reset();
    setMessage("User created.");
    setIsErrorMessage(false);
    onCreated();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      role="presentation"
    >
      <form
        aria-labelledby="add-user-title"
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
              id="add-user-title"
            >
              Add user
            </h2>
          </div>
          <button
            aria-label="Close add user dialog"
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
            className="h-12 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            name="username"
            placeholder="Username"
            required
            type="text"
          />
          <div className="space-y-1">
            <div className="relative">
              <input
                className="h-12 w-full rounded-md border border-slate-300 px-3 pr-10 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                minLength={8}
                name="password"
                placeholder="Password"
                required
                type={isPasswordVisible ? "text" : "password"}
              />
              <button
                aria-label={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
                className="absolute right-1 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
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
          <input
            className="h-12 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            name="position"
            placeholder="Position"
            type="text"
          />
          <input
            className="h-12 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            name="department"
            placeholder="Department"
            type="text"
          />
          <input
            className="h-12 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            name="email"
            placeholder="Email"
            type="email"
          />
          <div className="grid gap-5 self-end sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]">
            <RoleSelect defaultValue="USER" name="role" />
            <div className="flex justify-end gap-2">
              <button
                className="h-12 rounded-md border border-slate-300 px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSaving}
                type="reset"
              >
                Clear
              </button>
              <button
                className="h-12 rounded-md bg-slate-900 px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
        <p
          aria-live="polite"
          className={`mt-3 min-h-5 text-sm ${
            message ? "" : "invisible"
          } ${isErrorMessage ? "text-red-600" : "text-slate-600"}`}
        >
          {message || "No message"}
        </p>
      </form>
    </div>
  );
}
