import Link from "next/link";
import { UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

type ManageUsersButtonProps = {
  isActive?: boolean;
};

export function ManageUsersButton({ isActive = false }: ManageUsersButtonProps) {
  return (
    <Link
      aria-label="Manage users"
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30",
        isActive
          ? "border-[#1d9e75] bg-[#1d9e75]/15 text-[#1d9e75] shadow-sm hover:bg-[#1d9e75]/15 hover:text-[#1d9e75]"
          : "border-[#30363d] bg-[#21262d] text-[#8b949e] shadow-sm hover:border-[#3b444d] hover:bg-[#262d35] hover:text-[#e6edf3]",
      )}
      href="/admin/users"
      title="Manage users"
    >
      <UsersRound aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}
