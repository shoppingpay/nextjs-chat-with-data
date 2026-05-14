"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Search, UserRound } from "lucide-react";

import { DeleteUserDialog } from "@/app/(protected)/admin/users/delete-user-dialog";
import {
  EditUserDialog,
  type EditUserData,
} from "@/app/(protected)/admin/users/edit-user-dialog";
import { PasswordDialog } from "@/app/(protected)/admin/users/password-dialog";
import { UserForm } from "@/app/(protected)/admin/users/user-form";
import { UserPagination } from "@/app/(protected)/admin/users/user-pagination";
import { UserTableRow } from "@/app/(protected)/admin/users/user-table-row";

export type AdminUser = {
  id: string;
  username: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  email: string | null;
  position: string | null;
  department: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type UserTableProps = {
  hasNext: boolean;
  hasPrevious: boolean;
  nextHref: string;
  previousHref: string;
  search: string;
  users: AdminUser[];
};

export function UserTable({
  hasNext,
  hasPrevious,
  nextHref,
  previousHref,
  search,
  users,
}: UserTableProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [passwordDialogUser, setPasswordDialogUser] =
    useState<AdminUser | null>(null);
  const [passwordDialogMessage, setPasswordDialogMessage] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [deleteDialogUser, setDeleteDialogUser] = useState<AdminUser | null>(
    null,
  );
  const [deleteDialogMessage, setDeleteDialogMessage] = useState("");
  const [isDeleteSaving, setIsDeleteSaving] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editDialogUser, setEditDialogUser] = useState<AdminUser | null>(null);
  const [editDialogMessage, setEditDialogMessage] = useState("");
  const [isEditSaving, setIsEditSaving] = useState(false);

  function refresh() {
    router.refresh();
  }

  function handleUserCreated() {
    if (!search) {
      router.push("/admin/users");
      return;
    }

    refresh();
  }

  async function updateActive(user: AdminUser, isActive: boolean) {
    setMessage("");
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setMessage(result?.message ?? "Unable to update active status.");
      return;
    }

    refresh();
  }

  async function updateUserDetails(data: EditUserData) {
    if (!editDialogUser) {
      return;
    }

    setMessage("");
    setEditDialogMessage("");
    setIsEditSaving(true);

    const response = await fetch(`/api/admin/users/${editDialogUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setIsEditSaving(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setEditDialogMessage(result?.message ?? "Unable to update user details.");
      return;
    }

    setEditDialogUser(null);
    setEditDialogMessage("");
    refresh();
  }

  function closeEditDialog() {
    if (isEditSaving) {
      return;
    }

    setEditDialogUser(null);
    setEditDialogMessage("");
  }

  function openPasswordDialog(user: AdminUser) {
    setMessage("");
    setPasswordDialogMessage("");
    setPasswordDialogUser(user);
  }

  function closePasswordDialog() {
    if (isPasswordSaving) {
      return;
    }

    setPasswordDialogUser(null);
    setPasswordDialogMessage("");
  }

  async function updatePassword(newPassword: string) {
    if (!passwordDialogUser) {
      return;
    }

    setMessage("");
    setPasswordDialogMessage("");
    setIsPasswordSaving(true);

    const response = await fetch(`/api/admin/users/${passwordDialogUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });

    setIsPasswordSaving(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setPasswordDialogMessage(result?.message ?? "Unable to update password.");
      return;
    }

    closePasswordDialog();
  }

  function openDeleteDialog(user: AdminUser) {
    setMessage("");
    setDeleteDialogMessage("");
    setDeleteDialogUser(user);
  }

  function closeDeleteDialog() {
    if (isDeleteSaving) {
      return;
    }

    setDeleteDialogUser(null);
    setDeleteDialogMessage("");
  }

  async function deleteUser() {
    if (!deleteDialogUser) {
      return;
    }

    setMessage("");
    setDeleteDialogMessage("");
    setIsDeleteSaving(true);

    const response = await fetch(`/api/admin/users/${deleteDialogUser.id}`, {
      method: "DELETE",
    });

    setIsDeleteSaving(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setDeleteDialogMessage(result?.message ?? "Unable to delete user.");
      return;
    }

    setDeleteDialogUser(null);
    setDeleteDialogMessage("");
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1d9e75] px-4 text-sm font-semibold text-[#0a0e14] shadow-sm transition hover:bg-[#35bd91]"
          onClick={() => {
            setIsAddUserOpen(true);
          }}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <UserRound aria-hidden="true" className="h-4 w-4" />
          User
        </button>

        <form
          action="/admin/users"
          className="flex w-full gap-2 sm:max-w-xl"
        >
          <input
            className="h-10 min-w-0 flex-1 rounded-md border border-[#30363d] bg-[#0f141b] px-3 text-sm text-[#e6edf3] outline-none transition focus:border-[#1d9e75] focus:ring-2 focus:ring-[#1d9e75]/20"
            defaultValue={search}
            name="q"
            placeholder="Search username, role, or active status"
            type="search"
          />
          <button
            aria-label="Search users"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#21262d] text-[#e6edf3] shadow-sm transition hover:bg-[#30363d]"
            type="submit"
          >
            <Search aria-hidden="true" className="h-4 w-4" />
          </button>
        </form>
      </div>

      {message ? (
        <div className="rounded-md border border-[#ef9f27]/35 bg-[#ef9f27]/10 px-4 py-3 text-sm text-[#ef9f27]">
          {message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[10px] border border-[#21262d] bg-[#161b22] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] w-full table-fixed text-left text-sm">
            <thead className="bg-[#0f141b] text-xs uppercase text-[#8b949e]">
              <tr>
                <th className="w-36 px-4 py-3">Username</th>
                <th className="w-28 px-4 py-3">Role</th>
                <th className="w-28 px-2 py-3">Active</th>
                <th className="w-36 px-2 py-3">Position</th>
                <th className="w-36 px-4 py-3">Department</th>
                <th className="w-44 px-4 py-3">Email</th>
                <th className="w-32 px-4 py-3">Latest login</th>
                <th className="w-32 px-4 py-3">Created</th>
                <th className="w-32 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {users.map((user) => (
                <UserTableRow
                  key={user.id}
                  onActiveChange={updateActive}
                  onOpenDeleteDialog={openDeleteDialog}
                  onOpenEditDialog={(targetUser) => {
                    setMessage("");
                    setEditDialogMessage("");
                    setEditDialogUser(targetUser);
                  }}
                  onOpenPasswordDialog={openPasswordDialog}
                  user={user}
                />
              ))}
              {users.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm text-[#8b949e]"
                    colSpan={9}
                  >
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <UserPagination
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        onNext={() => {
          router.push(nextHref);
        }}
        onPrevious={() => {
          router.push(previousHref);
        }}
        recordCount={users.length}
      />

      {passwordDialogUser ? (
        <PasswordDialog
          errorMessage={passwordDialogMessage}
          isSaving={isPasswordSaving}
          onClose={closePasswordDialog}
          onSubmit={updatePassword}
          user={passwordDialogUser}
        />
      ) : null}

      {deleteDialogUser ? (
        <DeleteUserDialog
          errorMessage={deleteDialogMessage}
          isSaving={isDeleteSaving}
          onClose={closeDeleteDialog}
          onConfirm={deleteUser}
          user={deleteDialogUser}
        />
      ) : null}

      {editDialogUser ? (
        <EditUserDialog
          errorMessage={editDialogMessage}
          isSaving={isEditSaving}
          onClose={closeEditDialog}
          onSubmit={updateUserDetails}
          user={editDialogUser}
        />
      ) : null}

      {isAddUserOpen ? (
        <UserForm
          onClose={() => {
            setIsAddUserOpen(false);
          }}
          onCreated={handleUserCreated}
        />
      ) : null}
    </div>
  );
}
