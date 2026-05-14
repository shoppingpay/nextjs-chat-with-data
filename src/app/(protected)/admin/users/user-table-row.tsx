"use client";

import { KeyRound, Pencil, Trash2 } from "lucide-react";

import { DateTimeCell } from "@/app/(protected)/admin/users/date-time-cell";
import type { AdminUser } from "@/app/(protected)/admin/users/user-table";

type UserTableRowProps = {
  onActiveChange: (user: AdminUser, isActive: boolean) => void;
  onOpenDeleteDialog: (user: AdminUser) => void;
  onOpenEditDialog: (user: AdminUser) => void;
  onOpenPasswordDialog: (user: AdminUser) => void;
  user: AdminUser;
};

export function UserTableRow({
  onActiveChange,
  onOpenDeleteDialog,
  onOpenEditDialog,
  onOpenPasswordDialog,
  user,
}: UserTableRowProps) {
  const isSystemAdmin = user.username === "sys_admin";
  const roleLabel =
    user.role === "SUPER_ADMIN"
      ? "Super admin"
      : user.role === "ADMIN"
        ? "Admin"
        : "User";

  return (
    <tr className="transition hover:bg-[#1c2128]">
      <td className="truncate px-4 py-3 font-medium text-[#e6edf3]">
        {user.username}
      </td>
      <td className="px-4 py-3 font-medium text-[#e6edf3]">
        {roleLabel}
      </td>
      <td className="w-28 px-2 py-3">
        <label className="inline-flex w-24 items-center gap-2 text-[#8b949e]">
          <input
            checked={user.isActive}
            className="h-4 w-4 rounded border-[#30363d] text-[#1d9e75] focus:ring-[#1d9e75]/30 disabled:cursor-not-allowed"
            disabled={isSystemAdmin}
            onChange={(event) => {
              onActiveChange(user, event.target.checked);
            }}
            type="checkbox"
          />
          <span>{user.isActive ? "Active" : "Inactive"}</span>
        </label>
      </td>
      <td className="truncate px-2 py-3 text-[#8b949e]">
        {user.position || "-"}
      </td>
      <td className="truncate px-4 py-3 text-[#8b949e]">
        {user.department || "-"}
      </td>
      <td className="truncate px-4 py-3 text-[#8b949e]">
        {user.email || "-"}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-[#8b949e]">
        {user.lastLoginAt ? <DateTimeCell value={user.lastLoginAt} /> : "Never"}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-[#8b949e]">
        <DateTimeCell value={user.createdAt} />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1.5">
          <button
            aria-label={`Edit ${user.username}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#30363d] text-[#8b949e] transition hover:bg-[#21262d] hover:text-[#e6edf3]"
            onClick={() => onOpenEditDialog(user)}
            title="Edit"
            type="button"
          >
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label={`Change password for ${user.username}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#30363d] text-[#8b949e] transition hover:bg-[#21262d] hover:text-[#e6edf3]"
            onClick={() => onOpenPasswordDialog(user)}
            title="Change password"
            type="button"
          >
            <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label={`Delete ${user.username}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#30363d] text-[#e24b4a] transition hover:bg-[#e24b4a]/10 disabled:cursor-not-allowed disabled:text-[#30363d]"
            disabled={isSystemAdmin}
            onClick={() => onOpenDeleteDialog(user)}
            title="Delete user"
            type="button"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
